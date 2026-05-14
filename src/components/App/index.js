import React, { useState } from 'react';
import Main from '../Main';
import Quiz from '../Quiz';
import Part6Quiz from '../Part6Quiz';
import Part7Quiz from '../Part7Quiz';
import WordDrill from '../WordDrill';
import Result from '../Result';
import Review from '../Review';
import VocabManager from '../VocabManager';
import Loader from '../Loader';

// screen: 'home' | 'quiz' | 'part6' | 'part7' | 'vocab' | 'result' | 'review'
const App = () => {
  const [screen, setScreen] = useState('home');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Generating questions…');
  const [homeError, setHomeError] = useState(null); // persists across loading cycles
  const [quizData, setQuizData] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [quizConfig, setQuizConfig] = useState(null);

  const startLoading = (msg = 'Generating questions…') => {
    setHomeError(null);
    setLoadingMsg(msg);
    setLoading(true);
  };

  const stopLoadingWithError = (msg) => {
    setLoading(false);
    setHomeError(msg);
  };

  const beginQuiz = (mode, data, config) => {
    setQuizData(data);
    setQuizConfig(config);
    setLoading(false);
    setHomeError(null);
    setScreen(mode);
  };

  const finishQuiz = (result) => {
    setResultData({ ...result, mode: screen, config: quizConfig });
    setScreen('result');
  };

  const goHome = () => {
    setScreen('home');
    setQuizData(null);
    setResultData(null);
    setQuizConfig(null);
    setLoading(false);
  };

  if (loading) return <Loader message={loadingMsg} />;

  if (screen === 'home') return (
    <Main
      onStart={beginQuiz}
      onStartLoading={startLoading}
      onError={stopLoadingWithError}
      errorMsg={homeError}
      onReview={() => setScreen('review')}
      onVocabManager={() => setScreen('vocabmanager')}
    />
  );
  if (screen === 'quiz') return <Quiz data={quizData} config={quizConfig} onFinish={finishQuiz} onHome={goHome} />;
  if (screen === 'part6') return <Part6Quiz data={quizData} config={quizConfig} onFinish={finishQuiz} onHome={goHome} />;
  if (screen === 'part7') return <Part7Quiz data={quizData} config={quizConfig} onFinish={finishQuiz} onHome={goHome} />;
  if (screen === 'vocab') return <WordDrill data={quizData} config={quizConfig} onFinish={finishQuiz} onHome={goHome} />;
  if (screen === 'result') return (
    <Result
      data={resultData}
      onHome={goHome}
      onReview={() => setScreen('review')}
      onRetry={() => setScreen(resultData.mode)}
    />
  );
  if (screen === 'review')       return <Review onHome={goHome} />;
  if (screen === 'vocabmanager') return <VocabManager onHome={goHome} />;

  return null;
};

export default App;
