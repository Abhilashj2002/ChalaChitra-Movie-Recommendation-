import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

// Dummy chatbot data for demonstration
const initialChatbotData = [
  { id: 1, question: 'What is ChalaChitra?', answer: 'ChalaChitra is your intelligent movie companion.' },
  { id: 2, question: 'How do I use the chatbot?', answer: 'Just type your question and get instant movie advice!' }
];

const AdminChatbotPage: React.FC = () => {
  const [chatbotData, setChatbotData] = useState(initialChatbotData);
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');

  const handleAddQA = () => {
    if (newQ.trim() && newA.trim()) {
      setChatbotData([...chatbotData, { id: Date.now(), question: newQ, answer: newA }]);
      setNewQ('');
      setNewA('');
    }
  };
  const handleEditQA = (id: number, field: 'question' | 'answer', value: string) => {
    setChatbotData(chatbotData.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  const handleDeleteQA = (id: number) => {
    setChatbotData(chatbotData.filter(item => item.id !== id));
  };

  return (
    <div className="p-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-black mb-8 text-yellow-600 uppercase tracking-widest">Chatbot Q&A Editor</h1>
      <div className="mb-8">
        <h2 className="font-bold mb-2">Add New Q&A</h2>
        <input
          className="border rounded px-2 py-1 mr-2"
          placeholder="Question"
          value={newQ}
          onChange={e => setNewQ(e.target.value)}
        />
        <input
          className="border rounded px-2 py-1 mr-2"
          placeholder="Answer"
          value={newA}
          onChange={e => setNewA(e.target.value)}
        />
        <button className="bg-yellow-500 text-black px-4 py-1 rounded font-bold" onClick={handleAddQA}>Add</button>
      </div>
      <div>
        <h2 className="font-bold mb-2">Edit Q&A</h2>
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="text-yellow-700">
              <th className="p-2 text-left">Question</th>
              <th className="p-2 text-left">Answer</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {chatbotData.map(item => (
              <tr key={item.id}>
                <td className="p-2">
                  <input
                    className="border rounded px-2 py-1 w-full"
                    value={item.question}
                    onChange={e => handleEditQA(item.id, 'question', e.target.value)}
                  />
                </td>
                <td className="p-2">
                  <input
                    className="border rounded px-2 py-1 w-full"
                    value={item.answer}
                    onChange={e => handleEditQA(item.id, 'answer', e.target.value)}
                  />
                </td>
                <td className="p-2 text-center">
                  <button className="text-red-500 font-bold" onClick={() => handleDeleteQA(item.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminChatbotPage;
