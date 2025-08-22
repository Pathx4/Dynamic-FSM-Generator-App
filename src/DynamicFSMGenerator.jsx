import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, Pause, Zap } from "lucide-react";

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

  // Generate SVG for dynamic FSM with organized layout
  const generateFSMSVG = () => {
    if (Object.keys(fsmStates).length === 0) return null;

    const statePositions = {};
    const maxDepth = Math.max(...Object.values(fsmStates).map(s => s.depth || 0));
    
    // Organize states by word and depth for clean grid layout
    const statesByWord = {};
    words.forEach((word, idx) => {
      statesByWord[word] = [];
    });

    // Group states by their word
    Object.entries(fsmStates).forEach(([stateId, stateData]) => {
      const id = parseInt(stateId);
      if (id === 0) {
        // Start state in center-left
        statePositions[id] = { x: 100, y: (words.length * 80) / 2 + 100 };
      } else if (stateData.word) {
        statesByWord[stateData.word].push({
          id: id,
          depth: stateData.depth,
          data: stateData
        });
      }
    });

    // Calculate grid positions for each word's states
    const GRID_SIZE = 100; // Distance between states
    const ROW_HEIGHT = 80;  // Distance between word rows
    const START_X = 220;    // Start position for first column
    const START_Y = 100;    // Start position for first row

    words.forEach((word, wordIndex) => {
      const wordStates = statesByWord[word];
      wordStates.sort((a, b) => a.depth - b.depth); // Sort by depth
      
      wordStates.forEach((stateInfo, depthIndex) => {
        statePositions[stateInfo.id] = {
          x: START_X + (stateInfo.depth - 1) * GRID_SIZE,
          y: START_Y + wordIndex * ROW_HEIGHT,
          word: word,
          depth: stateInfo.depth
        };
      });
    });

    const svgWidth = Math.max(800, START_X + maxDepth * GRID_SIZE + 100);
    const svgHeight = Math.max(500, START_Y + words.length * ROW_HEIGHT + 100);

    return (
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="border rounded bg-gray-50">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="7" 
                  refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#374151" />
          </marker>
        </defs>

        {/* Draw transitions first (behind states) */}
        {Object.entries(transitions).map(([fromState, charTransitions]) => {
          return Object.entries(charTransitions).map(([char, toState]) => {
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
                <rect 
                  x={midX - 8} y={midY - 8} 
                  width="16" height="16" 
                  fill="white" stroke="#374151" rx="2"
                />
                <text 
                  x={midX} y={midY + 4} 
                  textAnchor="middle" 
                  className="text-xs font-bold fill-current"
                >
                  {char}
                </text>
              </g>
            );
          });
        })}

        {/* Draw states */}
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
                  x={pos.x} y={pos.y - 35} 
                  textAnchor="middle" 
                  className="text-xs text-blue-600 font-semibold"
                >
                  START
                </text>
              )}
              {isFinal && (
                <text 
                  x={pos.x} y={pos.y + 40} 
                  textAnchor="middle" 
                  className="text-xs text-green-600 font-semibold"
                >
                  {finalStates[id]}
                </text>
              )}
              {fsmStates[id]?.partialWord && (
                <text 
                  x={pos.x + 35} y={pos.y + 4} 
                  className="text-xs text-gray-600 font-mono"
                >
                  "{fsmStates[id].partialWord}"
                </text>
              )}
            </g>
          );
        })}

        {/* Current token building display */}
        <rect x={20} y={20} width={200} height={40} fill="#fef3c7" stroke="#f59e0b" rx="4"/>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Dynamic FSM Generator
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Create Dynamic Finite State Machine from Input Text with Real-time Recognition
          </p>
        </div>

        {/* Input Section with Presets */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Zap className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Input Configuration</h2>
              <p className="text-sm text-gray-500">Define words to create FSM</p>
            </div>
          </div>
          
          <div className="grid gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Input Words (Words to create FSM):
              </label>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  placeholder="e.g. cat dog bird or if then else"
                  disabled={isRunning}
                />
                <button
                  onClick={generateFSM}
                  disabled={!input.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md transition-all duration-200"
                >
                  <Zap size={18} />
                  Generate FSM
                </button>
              </div>
            </div>
            
            {/* Preset Examples */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Examples:</span>
                {presetExamples.map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(example)}
                    disabled={isRunning}
                    className="px-3 py-1 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-full text-sm transition-colors duration-200 disabled:opacity-50"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                onClick={runRecognizer}
                disabled={isRunning || !input.trim() || Object.keys(fsmStates).length === 0}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md transition-all duration-200"
              >
                <Play size={18} />
                Run Recognition
              </button>
              <button
                onClick={() => setIsPaused(!isPaused)}
                disabled={!isRunning}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md transition-all duration-200"
              >
                <Pause size={18} />
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={reset}
                className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 flex items-center gap-2 shadow-md transition-all duration-200"
              >
                <RefreshCw size={18} />
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Generated Words Display */}
        {words.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">🎯</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800">Generated FSM Status</h3>
                <p className="text-sm text-gray-500">FSM Creation Status</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Words in FSM:</h4>
                <div className="flex flex-wrap gap-2">
                  {words.map((word, idx) => (
                    <span key={idx} className="px-4 py-2 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 rounded-full font-mono font-medium border border-blue-200">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{Object.keys(fsmStates).length}</div>
                      <div className="text-sm text-gray-600">Total States</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{Object.keys(finalStates).length}</div>
                      <div className="text-sm text-gray-600">Final States</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic FSM Transition Diagram */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">🔄</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">Dynamic FSM Transition Diagram</h3>
              <p className="text-sm text-gray-500">FSM State Transition Visualization</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-6 overflow-x-auto">
            {generateFSMSVG()}
          </div>
        </div>

        {/* Input Analysis */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">⚡</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">Input Analysis</h3>
              <p className="text-sm text-gray-500">Real-time Input Analysis</p>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="font-mono text-xl tracking-wider mb-4 flex flex-wrap gap-1">
              {input.split('').map((char, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-1 rounded-md transition-all duration-300 ${
                    idx === currentPos ? 'bg-yellow-300 border-2 border-yellow-500 shadow-md transform scale-110' :
                    idx < currentPos ? 'bg-green-100 border border-green-300' : 'bg-white border border-gray-200'
                  }`}
                >
                  {char === ' ' ? '⎵' : char}
                </span>
              ))}
            </div>
            {currentPos >= 0 && currentPos < input.length && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="grid md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-yellow-600">'{input[currentPos]}'</div>
                    <div className="text-sm text-gray-600">Current Character</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">{currentPos}</div>
                    <div className="text-sm text-gray-600">Position</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-600">{currentState}</div>
                    <div className="text-sm text-gray-600">Current State</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tokens Output */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">🎯</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800">Recognition Results</h3>
                <p className="text-sm text-gray-500">Token Recognition Results</p>
              </div>
            </div>
            <div className="bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg px-4 py-2 border border-emerald-200">
              <span className="text-emerald-800 font-semibold">{tokens.length} tokens</span>
            </div>
          </div>
          
          {tokens.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tokens.map((token, idx) => (
                <div key={idx} className={`relative overflow-hidden rounded-lg border-l-4 transition-all duration-200 hover:shadow-md ${
                  token.type === 'KEYWORD'
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400' 
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-400'
                }`}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-lg font-bold text-gray-800">{token.value}</span>
                      <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded-full">@{token.position}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                        token.type === 'KEYWORD' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {token.type === 'KEYWORD' ? `KEYWORD (${token.keyword})` : 'IDENTIFIER'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⏳</span>
              </div>
              <p className="text-gray-500 italic text-lg">No tokens yet - Click Run Recognition to start</p>
            </div>
          )}
        </div>

        {/* FSM Info */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">🔧</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">Dynamic FSM Features</h3>
              <p className="text-sm text-gray-500">Features and Capabilities</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-100">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">⚡</span>
                <h4 className="font-semibold text-purple-700">Dynamic Generation</h4>
              </div>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>Creates new FSM for every input</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>Uses Trie structure for auto-build</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>Supports unlimited keywords</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>Visual diagram updates dynamically</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🎯</span>
                <h4 className="font-semibold text-blue-700">Recognition Features</h4>
              </div>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Separates KEYWORD vs IDENTIFIER</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Real-time state visualization</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Longest match principle</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Whitespace handling</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicFSMGenerator;