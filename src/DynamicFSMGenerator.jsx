import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, Pause, Zap } from 'lucide-react';

const DynamicFSMGenerator = () => {
  const [input, setInput] = useState('cat dog bird');
  const [words, setWords] = useState([]);
  const [fsmStates, setFsmStates] = useState({});
  const [transitions, setTransitions] = useState({});
  const [finalStates, setFinalStates] = useState({});
  const [currentState, setCurrentState] = useState(0);
  const [currentPos, setCurrentPos] = useState(0);
  const [tokens, setTokens] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentToken, setCurrentToken] = useState('');

  // Generate FSM from input words
  const generateFSM = () => {
    const inputWords = input.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0);
    setWords(inputWords);
    
    let stateCounter = 0;
    const newTransitions = {};
    const newFinalStates = {};
    const newStates = { 0: { isStart: true, words: inputWords } };
    
    // Build trie-like FSM
    inputWords.forEach(word => {
      let currentStateId = 0;
      
      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        
        if (!newTransitions[currentStateId]) {
          newTransitions[currentStateId] = {};
        }
        
        if (!newTransitions[currentStateId][char]) {
          stateCounter++;
          newTransitions[currentStateId][char] = stateCounter;
          newStates[stateCounter] = { 
            char: char, 
            depth: i + 1,
            word: word,
            partialWord: word.substring(0, i + 1)
          };
        }
        
        currentStateId = newTransitions[currentStateId][char];
        
        // Mark final state if this is the end of a word
        if (i === word.length - 1) {
          newFinalStates[currentStateId] = word.toUpperCase();
        }
      }
    });
    
    setFsmStates(newStates);
    setTransitions(newTransitions);
    setFinalStates(newFinalStates);
    setCurrentState(0);
    setCurrentPos(0);
    setTokens([]);
    setCurrentToken('');
  };

  // Auto-generate FSM when input changes
  useEffect(() => {
    if (input.trim()) {
      generateFSM();
    }
  }, [input]);

  const getNextState = (currentState, char) => {
    return transitions[currentState] ? transitions[currentState][char] : undefined;
  };

  const isWhitespace = (char) => /\s/.test(char);

  const runRecognizer = async () => {
    setIsRunning(true);
    setTokens([]);
    setCurrentToken('');
    
    let pos = 0;
    let state = 0;
    let tokenStart = 0;
    let currentWord = '';
    let newTokens = [];
    
    while (pos < input.length) {
      if (isPaused) {
        await new Promise(resolve => {
          const checkPause = () => {
            if (!isPaused) resolve();
            else setTimeout(checkPause, 100);
          };
          checkPause();
        });
      }

      setCurrentPos(pos);
      setCurrentState(state);
      
      const char = input[pos].toLowerCase();
      
      if (isWhitespace(input[pos])) {
        if (state !== 0) {
          if (finalStates[state]) {
            newTokens.push({
              type: 'KEYWORD',
              value: currentWord,
              keyword: finalStates[state],
              position: tokenStart
            });
            setTokens([...newTokens]);
            currentWord = '';
          } else if (currentWord) {
            newTokens.push({
              type: 'IDENTIFIER',
              value: currentWord,
              position: tokenStart
            });
            setTokens([...newTokens]);
            currentWord = '';
          }
          state = 0;
        }
        
        while (pos < input.length && isWhitespace(input[pos])) {
          pos++;
        }
        tokenStart = pos;
        continue;
      }
      
      const nextState = getNextState(state, char);
      setCurrentToken(currentWord + input[pos]);
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      if (nextState !== undefined) {
        state = nextState;
        currentWord += input[pos];
        pos++;
      } else {
        if (state === 0) {
          currentWord = input[pos];
          while (pos + 1 < input.length && 
                 !isWhitespace(input[pos + 1]) && 
                 /[a-zA-Z]/.test(input[pos + 1])) {
            pos++;
            currentWord += input[pos];
          }
          newTokens.push({
            type: 'IDENTIFIER',
            value: currentWord,
            position: tokenStart
          });
          setTokens([...newTokens]);
          pos++;
          currentWord = '';
          tokenStart = pos;
        } else {
          newTokens.push({
            type: 'IDENTIFIER',
            value: currentWord,
            position: tokenStart
          });
          setTokens([...newTokens]);
          state = 0;
          currentWord = '';
          tokenStart = pos;
        }
      }
    }
    
    if (state !== 0) {
      if (finalStates[state]) {
        newTokens.push({
          type: 'KEYWORD',
          value: currentWord,
          keyword: finalStates[state],
          position: tokenStart
        });
      } else if (currentWord) {
        newTokens.push({
          type: 'IDENTIFIER', 
          value: currentWord,
          position: tokenStart
        });
      }
      setTokens([...newTokens]);
    }
    
    setIsRunning(false);
    setCurrentState(-1);
    setCurrentPos(-1);
    setCurrentToken('');
  };

  const reset = () => {
    setCurrentState(0);
    setCurrentPos(0);
    setTokens([]);
    setIsRunning(false);
    setIsPaused(false);
    setCurrentToken('');
  };

  // Generate SVG for dynamic FSM
    const generateFSMSVG = () => {
    if (Object.keys(fsmStates).length === 0) return null;

    const statePositions = {};
    const maxDepth = Math.max(...Object.values(fsmStates).map(s => s.depth || 0));

    const xStep = 120; // ระยะห่างแนวนอน
    const yStep = 80;  // ระยะห่างแนวตั้ง

    // จัดตำแหน่งเป็น grid: (depth, wordIndex)
    Object.entries(fsmStates).forEach(([stateId, stateData]) => {
      const id = parseInt(stateId);
      if (id === 0) {
        statePositions[id] = { x: 80, y: 100 }; // Start state
      } else {
        const depth = stateData.depth || 1;
        const wordIndex = words.indexOf(stateData.word);
        statePositions[id] = {
          x: 80 + depth * xStep,
          y: 100 + wordIndex * yStep
        };
      }
    });

    const svgWidth = Math.max(600, (maxDepth + 2) * xStep);
    const svgHeight = Math.max(400, words.length * yStep + 200);

    return (
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="border rounded bg-gray-50"
      >
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="7" 
                  refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#374151" />
          </marker>
        </defs>

        {/* วาด transitions */}
        {Object.entries(transitions).map(([fromState, charTransitions]) =>
          Object.entries(charTransitions).map(([char, toState]) => {
            const from = statePositions[fromState];
            const to = statePositions[toState];
            if (!from || !to) return null;

            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2 - 20;

            return (
              <g key={`${fromState}-${char}-${toState}`}>
                <line
                  x1={from.x + 20} y1={from.y}
                  x2={to.x - 20} y2={to.y}
                  stroke="#374151" strokeWidth="2"
                  markerEnd="url(#arrow)"
                />
                <text
                  x={midX} y={midY}
                  textAnchor="middle"
                  className="text-xs font-bold fill-current"
                >
                  {char}
                </text>
              </g>
            );
          })
        )}

        {/* วาด states */}
        {Object.entries(statePositions).map(([stateId, pos]) => {
          const id = parseInt(stateId);
          const isCurrent = currentState === id;
          const isFinal = finalStates[id];
          const isStart = id === 0;

          let fillColor = '#f9fafb';
          let strokeColor = '#6b7280';

          if (isCurrent) {
            fillColor = '#fef3c7';
            strokeColor = '#f59e0b';
          } else if (isFinal) {
            fillColor = '#dcfce7';
            strokeColor = '#22c55e';
          } else if (isStart) {
            fillColor = '#dbeafe';
            strokeColor = '#3b82f6';
          }

          return (
            <g key={stateId}>
              <circle
                cx={pos.x} cy={pos.y} r="20"
                fill={fillColor} stroke={strokeColor} strokeWidth="2"
              />
              {isFinal && (
                <circle
                  cx={pos.x} cy={pos.y} r="15"
                  fill="none" stroke={strokeColor} strokeWidth="1"
                />
              )}
              <text
                x={pos.x} y={pos.y + 4}
                textAnchor="middle"
                className="text-sm font-bold"
              >
                {stateId}
              </text>
              {isStart && (
                <text
                  x={pos.x} y={pos.y - 30}
                  textAnchor="middle"
                  className="text-xs text-blue-600 font-semibold"
                >
                  START
                </text>
              )}
              {isFinal && (
                <text
                  x={pos.x} y={pos.y + 35}
                  textAnchor="middle"
                  className="text-xs text-green-600 font-semibold"
                >
                  {finalStates[id]}
                </text>
              )}
            </g>
          );
        })}

        {/* แสดง token ที่กำลัง build */}
        <rect x={20} y={20} width={200} height={40} fill="#fef3c7" stroke="#f59e0b" rx="4" />
        <text x={30} y={35} className="text-sm font-semibold">Building Token:</text>
        <text x={30} y={50} className="text-lg font-mono font-bold">{currentToken}</text>
      </svg>
    );
  };


  const presetExamples = [
    'cat dog bird',
    'if then else',
    'hello world test',
    'begin end start stop',
    'red blue green yellow',
    'apple banana cherry'
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Dynamic FSM Generator</h1>
        <p className="text-gray-600">สร้าง Finite State Machine แบบ Dynamic ตาม Input Text</p>
      </div>

      {/* Input Section with Presets */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Input Words (คำที่ต้องการสร้าง FSM):
        </label>
        <div className="flex gap-3 mb-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="เช่น cat dog bird หรือ if then else"
            disabled={isRunning}
          />
          <button
            onClick={generateFSM}
            disabled={!input.trim()}
            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 flex items-center gap-2"
          >
            <Zap size={16} />
            Generate FSM
          </button>
        </div>
        
        {/* Preset Examples */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-sm text-gray-600 mr-2">ตัวอย่าง:</span>
          {presetExamples.map((example, idx) => (
            <button
              key={idx}
              onClick={() => setInput(example)}
              disabled={isRunning}
              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={runRecognizer}
            disabled={isRunning || !input.trim() || Object.keys(fsmStates).length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
          >
            <Play size={16} />
            Run Recognition
          </button>
          <button
            onClick={() => setIsPaused(!isPaused)}
            disabled={!isRunning}
            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
          >
            <Pause size={16} />
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={reset}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Reset
          </button>
        </div>
      </div>

      {/* Generated Words Display */}
      {words.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">🎯 Generated FSM for Words</h3>
          <div className="flex flex-wrap gap-2">
            {words.map((word, idx) => (
              <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-mono">
                {word}
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            สร้าง FSM แล้ว {Object.keys(fsmStates).length} states, {Object.keys(finalStates).length} final states
          </p>
        </div>
      )}

      {/* Dynamic FSM Transition Diagram */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">🔄 Dynamic FSM Transition Diagram</h3>
        <div className="overflow-x-auto">
          {generateFSMSVG()}
        </div>
      </div>

      {/* Input Analysis */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Input Analysis</h3>
        <div className="font-mono text-lg tracking-wider">
          {input.split('').map((char, idx) => (
            <span
              key={idx}
              className={`px-1 py-1 rounded ${
                idx === currentPos ? 'bg-yellow-200 border-2 border-yellow-400' :
                idx < currentPos ? 'bg-green-100' : 'bg-gray-100'
              }`}
            >
              {char === ' ' ? '␣' : char}
            </span>
          ))}
        </div>
        {currentPos >= 0 && currentPos < input.length && (
          <div className="text-center mt-2">
            <p className="text-sm text-gray-600">
              กำลังประมวลผล: <span className="font-mono bg-yellow-100 px-2 py-1 rounded">'{input[currentPos]}'</span>
              {' '}ที่ตำแหน่ง {currentPos} | State: {currentState}
            </p>
          </div>
        )}
      </div>

      {/* Tokens Output */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Recognition Results ({tokens.length})</h3>
        {tokens.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-3">
            {tokens.map((token, idx) => (
              <div key={idx} className={`flex items-center justify-between px-4 py-3 rounded border-l-4 ${
                token.type === 'KEYWORD'
                  ? 'bg-green-50 border-green-400' 
                  : 'bg-blue-50 border-blue-400'
              }`}>
                <div>
                  <span className="font-mono text-lg font-bold">{token.value}</span>
                  <div className="text-sm text-gray-600">
                    {token.type === 'KEYWORD' ? `${token.type} (${token.keyword})` : token.type}
                  </div>
                </div>
                <span className="text-xs text-gray-400">@{token.position}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">ยังไม่มี tokens</p>
        )}
      </div>

      {/* FSM Info */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">🔧 Dynamic FSM Features</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-purple-600 mb-2">Dynamic Generation:</h4>
            <ul className="text-sm space-y-1">
              <li>• สร้าง FSM ใหม่ทุกครั้งตาม input</li>
              <li>• ใช้ Trie structure แบบ auto-build</li>
              <li>• รองรับคำใดก็ได้ไม่จำกัด</li>
              <li>• Visual diagram ปรับตามคำที่ใส่</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-blue-600 mb-2">Recognition Features:</h4>
            <ul className="text-sm space-y-1">
              <li>• แยกแยะ KEYWORD vs IDENTIFIER</li>
              <li>• Real-time state visualization</li>
              <li>• Longest match principle</li>
              <li>• Whitespace handling</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicFSMGenerator;