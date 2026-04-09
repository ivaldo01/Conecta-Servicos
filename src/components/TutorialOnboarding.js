import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const { width, height } = Dimensions.get('window');

const TUTORIAL_STEPS_CLIENTE = [
  {
    id: 1,
    icon: 'search',
    title: 'Encontre Profissionais',
    description: 'Use a busca para encontrar profissionais por categoria, proximidade ou avaliação.',
    color: '#2196F3',
  },
  {
    id: 2,
    icon: 'calendar',
    title: 'Agende Online',
    description: 'Escolha o horário que preferir e agende em segundos. Sem ligações, sem espera!',
    color: '#4CAF50',
  },
  {
    id: 3,
    icon: 'card',
    title: 'Pagamento Seguro',
    description: 'Pague pelo app com PIX ou cartão. Seu dinheiro só é liberado após o atendimento.',
    color: '#FF9800',
  },
  {
    id: 4,
    icon: 'star',
    title: 'Avalie o Atendimento',
    description: 'Após o serviço, avalie o profissional para ajudar outros clientes.',
    color: '#9C27B0',
  },
];

const TUTORIAL_STEPS_PROFISSIONAL = [
  {
    id: 1,
    icon: 'person',
    title: 'Complete seu Perfil',
    description: 'Adicione fotos, descrição dos serviços e configure sua agenda de disponibilidade.',
    color: '#2196F3',
  },
  {
    id: 2,
    icon: 'list',
    title: 'Cadastre seus Serviços',
    description: 'Adicione os serviços que você oferece com preços e duração.',
    color: '#4CAF50',
  },
  {
    id: 3,
    icon: 'notifications',
    title: 'Receba Agendamentos',
    description: 'Clientes vão te encontrar e agendar online. Você recebe notificações em tempo real.',
    color: '#FF9800',
  },
  {
    id: 4,
    icon: 'cash',
    title: 'Receba Pagamentos',
    description: 'O pagamento cai na sua conta de forma segura após o atendimento.',
    color: '#9C27B0',
  },
];

export default function TutorialOnboarding({ userId, userType, onComplete, visible }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(visible);

  const steps = userType === 'profissional' ? TUTORIAL_STEPS_PROFISSIONAL : TUTORIAL_STEPS_CLIENTE;
  const currentStepData = steps[currentStep];

  useEffect(() => {
    setShowTutorial(visible);
  }, [visible]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      // Marca que o usuário já viu o tutorial
      if (userId) {
        const userRef = doc(db, 'usuarios', userId);
        await updateDoc(userRef, {
          tutorialVisto: true,
          tutorialVistoEm: new Date(),
        });
      }
    } catch (error) {
      console.log('Erro ao salvar tutorial visto:', error);
    }

    setShowTutorial(false);
    onComplete?.();
  };

  if (!showTutorial) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showTutorial}
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header com opção de pular */}
          <View style={styles.header}>
            <Text style={styles.stepIndicator}>
              Passo {currentStep + 1} de {steps.length}
            </Text>
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Pular</Text>
            </TouchableOpacity>
          </View>

          {/* Conteúdo Principal */}
          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: currentStepData.color + '20' }]}>
              <Ionicons 
                name={currentStepData.icon} 
                size={80} 
                color={currentStepData.color} 
              />
            </View>

            <Text style={styles.title}>{currentStepData.title}</Text>
            <Text style={styles.description}>{currentStepData.description}</Text>
          </View>

          {/* Indicadores de Progresso */}
          <View style={styles.progressContainer}>
            {steps.map((step, index) => (
              <View
                key={step.id}
                style={[
                  styles.progressDot,
                  index === currentStep && styles.progressDotActive,
                  index < currentStep && styles.progressDotCompleted,
                ]}
              />
            ))}
          </View>

          {/* Botões de Navegação */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: currentStepData.color }]}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === steps.length - 1 ? 'Começar!' : 'Próximo'}
              </Text>
              <Ionicons 
                name={currentStep === steps.length - 1 ? 'checkmark' : 'arrow-forward'} 
                size={20} 
                color="#FFF" 
                style={styles.nextIcon}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width - 40,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    maxHeight: height * 0.8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepIndicator: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  content: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E0E0E0',
  },
  progressDotActive: {
    width: 24,
    backgroundColor: '#2196F3',
  },
  progressDotCompleted: {
    backgroundColor: '#4CAF50',
  },
  footer: {
    alignItems: 'center',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  nextIcon: {
    marginLeft: 8,
  },
});
