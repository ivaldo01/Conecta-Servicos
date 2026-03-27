import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { calcTotalServicos } from '../utils/calcTotalServicos';

export function useRelatoriosPro(uid) {
    const [loading, setLoading] = useState(true);
    const [agendamentosConcluidos, setAgendamentosConcluidos] = useState([]);
    const [avaliacoes, setAvaliacoes] = useState([]);

    const valorDoAgendamento = (data) => {
        return calcTotalServicos(data?.servicos, data?.preco);
    };

    const carregarDadosFinanceiros = async () => {
        setLoading(true);

        try {
            if (!uid) {
                setAgendamentosConcluidos([]);
                setAvaliacoes([]);
                setLoading(false);
                return;
            }

            const qAgendamentos = query(
                collection(db, 'agendamentos'),
                where('clinicaId', '==', uid),
                where('status', '==', 'concluido')
            );

            const qAvaliacoes = query(
                collection(db, 'avaliacoes'),
                where('profissionalId', '==', uid)
            );

            const [agendamentosSnap, avaliacoesSnap] = await Promise.all([
                getDocs(qAgendamentos),
                getDocs(qAvaliacoes),
            ]);

            const listaAgendamentos = agendamentosSnap.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
            }));

            const listaAvaliacoes = avaliacoesSnap.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
            }));

            const ordenados = [...listaAgendamentos].sort((a, b) => {
                const dataA = a.dataCriacao?.seconds || 0;
                const dataB = b.dataCriacao?.seconds || 0;
                return dataB - dataA;
            });

            setAgendamentosConcluidos(ordenados);
            setAvaliacoes(listaAvaliacoes);
        } catch (error) {
            console.error('Erro ao carregar relatório:', error);
            setAgendamentosConcluidos([]);
            setAvaliacoes([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDadosFinanceiros();
    }, [uid]);

    const resumo = useMemo(() => {
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth();
        const diaAtual = hoje.getDate();

        let faturamentoTotal = 0;
        let faturamentoHoje = 0;
        let faturamentoMes = 0;
        let totalAtendimentos = 0;
        let atendimentosHoje = 0;
        let atendimentosMes = 0;

        agendamentosConcluidos.forEach((item) => {
            const valor = valorDoAgendamento(item);
            faturamentoTotal += valor;
            totalAtendimentos += 1;

            let dataItem = null;

            if (item.dataFiltro) {
                const [ano, mes, dia] = item.dataFiltro.split('-').map(Number);
                dataItem = new Date(ano, mes - 1, dia);
            } else if (item.dataCriacao?.seconds) {
                dataItem = new Date(item.dataCriacao.seconds * 1000);
            }

            if (dataItem) {
                const mesmoAno = dataItem.getFullYear() === anoAtual;
                const mesmoMes = dataItem.getMonth() === mesAtual;
                const mesmoDia = dataItem.getDate() === diaAtual;

                if (mesmoAno && mesmoMes) {
                    faturamentoMes += valor;
                    atendimentosMes += 1;
                }

                if (mesmoAno && mesmoMes && mesmoDia) {
                    faturamentoHoje += valor;
                    atendimentosHoje += 1;
                }
            }
        });

        const ticketMedio =
            totalAtendimentos > 0 ? faturamentoTotal / totalAtendimentos : 0;

        const mediaAvaliacoes =
            avaliacoes.length > 0
                ? avaliacoes.reduce((acc, item) => acc + Number(item.nota || 0), 0) / avaliacoes.length
                : 0;

        return {
            faturamentoTotal,
            faturamentoHoje,
            faturamentoMes,
            totalAtendimentos,
            atendimentosHoje,
            atendimentosMes,
            ticketMedio,
            mediaAvaliacoes,
            totalAvaliacoes: avaliacoes.length,
        };
    }, [agendamentosConcluidos, avaliacoes]);

    const dadosGrafico = useMemo(() => {
        const itens = [
            { label: 'Hoje', valor: resumo.faturamentoHoje },
            { label: 'Mês', valor: resumo.faturamentoMes },
            { label: 'Total', valor: resumo.faturamentoTotal },
        ];

        const maiorValor = Math.max(...itens.map((i) => i.valor), 1);

        return itens.map((item) => ({
            ...item,
            percentual: (item.valor / maiorValor) * 100,
        }));
    }, [resumo]);

    const ultimosAtendimentos = useMemo(() => {
        return agendamentosConcluidos.slice(0, 5).map((item) => ({
            ...item,
            valorTotal: valorDoAgendamento(item),
        }));
    }, [agendamentosConcluidos]);

    return {
        loading,
        agendamentosConcluidos,
        avaliacoes,
        resumo,
        dadosGrafico,
        ultimosAtendimentos,
        carregarDadosFinanceiros,
    };
}