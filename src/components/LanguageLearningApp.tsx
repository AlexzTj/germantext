"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle, Save, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { sanitizeHtml } from '@/lib/sanitize';

// Types
interface WordAnalysis {
  grammarDetailsAndUsage: string;
  example: {
    german: string;
    russian: string;
  };
}

interface NotificationProps {
  message: string;
  type: 'error' | 'success' | 'info';
  onClose: () => void;
}

interface TextDisplayProps {
  text: string;
}

const FALLBACK_ANALYSIS: WordAnalysis = {
  grammarDetailsAndUsage: 'Reflexive Verb (sich erkundigen) - Used with preposition "nach"',
  example: {
    german: 'Ich erkundige mich nach den Öffnungszeiten.',
    russian: 'Я узнаю часы работы.'
  }
};

const Notification: React.FC<NotificationProps> = ({ message, type = 'info', onClose }) => (
  <div className={`mb-4 p-4 rounded ${type === 'error' ? 'bg-red-50' : type === 'success' ? 'bg-green-50' : 'bg-blue-50'}`}>
    <div className="flex justify-between items-center">
      <span>{message}</span>
      <Button variant="ghost" size="sm" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

const LanguageLearningApp: React.FC = () => {
  const [texts, setTexts] = useState<string[]>([]);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [newText, setNewText] = useState('');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordAnalysis, setWordAnalysis] = useState<WordAnalysis | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: NotificationProps['type'] } | null>(null);

  useEffect(() => {
    const savedTexts = localStorage.getItem('savedTexts');
    if (savedTexts) {
      setTexts(JSON.parse(savedTexts));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('savedTexts', JSON.stringify(texts));
  }, [texts]);

  const showNotification = (message: string, type: NotificationProps['type'] = 'info') => {
    setNotification({ message, type });
    if (type !== 'error') {
      setTimeout(() => setNotification(null), 3000);
    }
  };


  const analyzeWord = async (word: string, context: string) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ word, context })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setWordAnalysis(data);
      
    } catch (error) {
      console.error('Error analyzing word:', error);
      showNotification(
        error instanceof Error ? error.message : "Error analyzing word - Using fallback data",
        "error"
      );
      setWordAnalysis(FALLBACK_ANALYSIS);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToAnki = async (germanPhrase: string, russianTranslation: string) => {
    try {
      const response = await fetch('/api/anki', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ germanPhrase, russianTranslation })
      });

      if (!response.ok) {
        throw new Error('Anki Connect error');
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      showNotification("Successfully saved to Anki", "success");
    } catch (error) {
      console.error('Error saving to Anki:', error);
      showNotification("Error saving to Anki - Please check if Anki is running", "error");
    }
  };

  const readText = (text: string) => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Text-to-speech error:', error);
      showNotification("Unable to read text aloud", "error");
    }
  };

  const TextDisplay: React.FC<TextDisplayProps> = ({ text }) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-2">
        <div className="text-lg whitespace-pre-wrap">
          {lines.map((line, lineIndex) => (
            <div key={lineIndex}>
              {line.split(' ').map((word, wordIndex) => (
                <span
                  key={`${lineIndex}-${wordIndex}`}
                  onClick={() => handleWordClick(word, text)}
                  className="cursor-pointer hover:bg-blue-100 px-1 rounded"
                >
                  {word}{' '}
                </span>
              ))}
            </div>
          ))}
        </div>
        <Button 
          variant="outline" 
          size="sm"
          className="mt-2"
          onClick={() => readText(text)}
        >
          <PlayCircle className="mr-2 h-4 w-4" />
          Read Aloud
        </Button>
      </div>
    );
  };

  const handleWordClick = (word: string, text: string) => {
    setSelectedWord(word);
    analyzeWord(word, text);
  };

  const handleSaveText = () => {
    if (newText.trim()) {
      setTexts([...texts, newText]);
      setNewText('');
      setIsAddingNew(false);
      showNotification("Text saved successfully", "success");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Language Learning Assistant</h1>
        <Button onClick={() => setIsAddingNew(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Text
        </Button>
      </div>

      <Dialog open={isAddingNew} onOpenChange={setIsAddingNew}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Text</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Enter your text here..."
              rows={5}
              className="w-full p-2 border rounded-md font-mono whitespace-pre-wrap"
            />
            <Button onClick={handleSaveText}>
              <Save className="mr-2 h-4 w-4" />
              Save Text
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-4">
        {texts.map((text, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent 
              className="p-4"
              onClick={() => setSelectedText(text)}
            >
              <p className="line-clamp-2 whitespace-pre-line">{text}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedText && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <TextDisplay text={selectedText} />
          </CardContent>
        </Card>
      )}

      {(wordAnalysis || isLoading) && (
        <Card className="mt-4 bg-gray-50">
          <CardContent className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : wordAnalysis && (
              <div className="space-y-2">
                <div className="prose prose-sm max-w-none">
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: sanitizeHtml(wordAnalysis.grammarDetailsAndUsage) 
                    }} 
                    className="text-gray-800 leading-relaxed"
                  />
                </div>
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Example:</h4>
                  <div className="bg-white p-2 rounded mb-2">
                    <p>{wordAnalysis.example.german}</p>
                    <p className="text-gray-600">{wordAnalysis.example.russian}</p>
                    <div className="flex space-x-2 mt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => saveToAnki(wordAnalysis.example.german, wordAnalysis.example.russian)}
                      >
                        Save to Anki
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => readText(wordAnalysis.example.german)}
                      >
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Read
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LanguageLearningApp; 