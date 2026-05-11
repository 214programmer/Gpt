import clsx from "clsx";
import {
  ArrowDown,
  ArrowUp,
  Bot,
  Copy,
  Download,
  Layout,
  Loader2,
  Menu,
  MessageSquare,
  PlusCircle,
  Code,
  Send,
  Settings2,
  Sparkles,
  StopCircle,
  Trash2,
  User,
  X
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

import { Chat, GoogleGenAI } from "@google/genai";
import React, { KeyboardEvent, useEffect, useRef, useState } from "react";

type Role = "user" | "model";

interface ChatMessage {
  role: Role;
  content: string;
}

const MODES = {
  general: {
    id: "general",
    name: "Общий",
    icon: Sparkles,
    color: "text-cyan-400 bg-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.3)] border border-cyan-500/50",
    instruction: "Ти умный ИИ-ассистент. Общайся по-русски."
  },
  build: {
    id: "build",
    name: "Разработчик",
    icon: Code,
    color: "text-emerald-400 bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-500/50",
    instruction: "Ты мощный ИИ-разработчик и генератор кода в стиле Codex. Твоя главная и единственная цель — писать полностью рабочий код. Если тебя просят написать сайт или UI, напиши ВЕСЬ код целиком в ОДНОМ HTML-файле (используй встроенные теги <style> со скриптами Tailwind и <script> для JS/React, если нужно). Твой код ДОЛЖЕН БЫТЬ готов к запуску в браузере. Выдавай код строго внутри блока ```html, чтобы интерфейс мог отрендерить его во вкладке 'Превью'. Всегда выводи ПОЛНЫЙ код без сокращений и заглушек. Отвечай по-русски."
  },
  creative: {
    id: "creative",
    name: "Креатив",
    icon: MessageSquare,
    color: "text-fuchsia-400 bg-fuchsia-500/20 shadow-[0_0_15px_rgba(217,70,239,0.3)] border border-fuchsia-500/50",
    instruction: "Ты креативный автор, маркетолог и мыслитель. Твои ответы должны быть нестандартными, увлекательными и выразительными. Отвечай по-русски."
  }
};

const handleCopyCode = (text: string) => {
  navigator.clipboard.writeText(text);
};

const loadingMessages = [
  "Прогреваем нейронки...",
  "Анализируем запрос...",
  "Пьём виртуальный кофе...",
  "Пишем гениальный код...",
  "Кодим со скоростью света...",
  "Собираем баги (и фиксим)...",
  "Синтезируем ответ...",
  "Почти готово..."
];

const FunLoader = () => {
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % loadingMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-8 px-4 w-full my-4 animate-in fade-in duration-500">
       <div className="relative flex items-center justify-center w-20 h-20">
         <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-red-500 animate-[spin_1.5s_linear_infinite] transition-all duration-1000"></div>
         <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-pink-500 animate-[spin_2s_linear_infinite_reverse] transition-all duration-1000"></div>
         <Bot size={32} className="text-red-400 animate-pulse" />
       </div>
       <span className="text-lg text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-500 font-semibold animate-pulse tracking-wide text-center">
         {loadingMessages[msgIdx]}
       </span>
    </div>
  );
}

const CodeBlock = ({ children, ...props }: any) => {
  const [userSelectedTab, setUserSelectedTab] = useState<'code' | 'preview' | null>(null);

  let codeElement: React.ReactElement | null = null;
  if (React.isValidElement(children)) {
    codeElement = children as React.ReactElement;
  } else if (Array.isArray(children) && React.isValidElement(children[0])) {
    codeElement = children[0] as React.ReactElement;
  }

  if (codeElement) {
    const className = codeElement.props?.className || '';
    const match = /language-(\w+)/.exec(className);
    let language = match ? match[1] : ""; 
    const codeString = String(codeElement.props?.children || "").replace(/\n$/, "");
    
    if (!language) {
      const lower = codeString.trim().toLowerCase();
      if (lower.startsWith('<!doctype html') || lower.startsWith('<html')) {
        language = 'html';
      } else {
        language = 'text';
      }
    }
    
    const isHTML = language === "html" || language === "xml" || codeString.trim().toLowerCase().startsWith('<!doctype html>');
    const activeTab = userSelectedTab !== null ? userSelectedTab : (isHTML ? 'preview' : 'code');

    const handleDownloadCode = () => {
      const blob = new Blob([codeString], { type: isHTML ? 'text/html' : 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = isHTML ? 'index.html' : `code.${language || 'txt'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    return (
      <div className="relative group my-6 rounded-xl overflow-hidden border border-[#2a2a35] bg-[#0a0a0f] shadow-[0_5px_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between px-2 sm:px-4 bg-[#111116] text-gray-300 text-xs font-mono select-none border-b border-[#2a2a35] h-12 overflow-x-auto">
          <div className="flex items-center h-full shrink-0 pr-4">
            <span className="font-semibold text-gray-500 uppercase tracking-wider pl-2">{language || 'CODE'}</span>
          </div>
          <div className="flex items-center gap-1 h-full shrink-0">
            <button
              onClick={() => setUserSelectedTab('code')}
              className={clsx("transition-colors h-full flex items-center gap-1.5 px-3 font-medium", activeTab === 'code' ? 'text-white bg-white/5 border-b-2 border-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border-b-2 border-transparent')}
            >
              <Code size={14} /> Код
            </button>

            {isHTML && (
              <button
                onClick={() => setUserSelectedTab('preview')}
                className={clsx("transition-colors h-full flex items-center gap-1.5 px-3 font-medium", activeTab === 'preview' ? 'text-cyan-400 bg-cyan-500/10 border-b-2 border-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border-b-2 border-transparent')}
              >
                <Layout size={14} /> Превью
              </button>
            )}
            
            <div className="w-px h-4 bg-[#2a2a35] mx-1"></div>

            <button
              onClick={handleDownloadCode}
              className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors px-2.5 py-1.5 rounded-md hover:bg-white/10"
              title="Скачать код"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Скачать</span>
            </button>

            <button
              onClick={() => handleCopyCode(codeString)}
              className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors px-2.5 py-1.5 rounded-md hover:bg-white/10"
              title="Копировать код"
            >
              <Copy size={13} />
              <span className="hidden sm:inline">Копировать</span>
            </button>
          </div>
        </div>
        
        <div className={clsx(activeTab !== 'code' && 'hidden', "overflow-x-auto relative")}>
          <SyntaxHighlighter
            {...(codeElement.props || {})}
            children={codeString}
            style={vscDarkPlus}
            language={language === "text" ? "text" : language}
            PreTag="div"
            customStyle={{
              margin: 0,
              padding: "1.25rem",
              background: "transparent",
              fontSize: "0.875rem",
              lineHeight: "1.6",
            }}
          />
        </div>

        {isHTML && activeTab === 'preview' && (
          <div className="w-full h-[600px] bg-[#0a0a0f] relative group/preview">
            <iframe
              srcDoc={codeString}
              className="w-full h-full border-0 bg-white absolute inset-0 rounded-b-xl"
              sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"
            />
          </div>
        )}
      </div>
    );
  }
  return <pre {...props} className="bg-[#111116] p-4 rounded-xl overflow-x-auto my-4 text-sm font-mono border border-[#2a2a35] text-gray-300 shadow-inner">{children}</pre>;
};

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<keyof typeof MODES>("general");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => localStorage.getItem("user_gemini_api_key") || "");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatRef = useRef<Chat | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      setShowScrollTop(el.scrollTop > 300);
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // Initialize or re-initialize the chat when mode changes
  useEffect(() => {
    const savedMessages = localStorage.getItem(`gpt_history_${activeMode}`);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed);
        // Re-initialize genai with history
        const envKey = process.env.GEMINI_API_KEY;
        const keyToUse = apiKeyInput || envKey;
        if (!keyToUse) {
          console.warn("GEMINI_API_KEY is not set.");
        }
        const ai = new GoogleGenAI({ apiKey: keyToUse || "MISSING_KEY" });
        const contents = parsed
           .filter((m: ChatMessage) => m.content.trim() !== "" && !m.content.startsWith("Привет! Я активировал")) // Ignore welcome msg if any
           .map((m: ChatMessage) => ({ role: m.role, parts: [{ text: m.content }] }));
           
        chatRef.current = ai.chats.create({
          model: "gemini-3.1-pro-preview",
          config: {
            systemInstruction: MODES[activeMode].instruction,
          },
        });
        
        // Push history if possible (SDK might not allow pushing raw history directly like this in v1.29 without some hack, actually we can just pass history to config in v2 or not do it. Let's just not seed the chat context for past messages if it's too complex or we can do a simpler approach: create with history)
        // Wait, SDK chat.create allows passing `history` array! Let's do that!
        
        chatRef.current = ai.chats.create({
          model: "gemini-3.1-pro-preview",
          config: {
            systemInstruction: MODES[activeMode].instruction,
          },
          history: parsed
             .filter((m: ChatMessage) => m.content.trim() !== "" && !m.content.startsWith("Привет! Я активировал"))
             .map((m: ChatMessage) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] }))
        });

      } catch (e) {
        startNewChat();
      }
    } else {
      startNewChat();
    }
  }, [activeMode]);

  // Save messages to local storage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`gpt_history_${activeMode}`, JSON.stringify(messages));
    }
  }, [messages, activeMode]);

  const startNewChat = () => {
    const envKey = process.env.GEMINI_API_KEY;
    const keyToUse = apiKeyInput || envKey;
    if (!keyToUse) {
      setMessages([{ role: "model", content: "⚠️ АПИ ключ не найден. Пожалуйста, зайдите в 'Настройки' и укажите свой Gemini API Key, или добавьте его в переменные окружения на Vercel." }]);
      return;
    }
    const ai = new GoogleGenAI({ apiKey: keyToUse });
    chatRef.current = ai.chats.create({
      model: "gemini-3.1-pro-preview",
      config: {
        systemInstruction: MODES[activeMode].instruction,
      }
    });

    setMessages([
      {
        role: "model",
        content: `Привет! Я активировал режим **«${MODES[activeMode].name}»**. Чем я могу помочь?`,
      },
    ]);
    localStorage.removeItem(`gpt_history_${activeMode}`);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const scrollToBottom = () => {
    scrollContainerRef.current?.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: "smooth"
    });
  };

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    // Only auto-scroll to bottom if user is close to the bottom already,
    // or when adding the first few messages
    if (scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      if (isNearBottom || messages.length <= 2) {
        scrollToBottom();
      }
    }
  }, [messages]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const handleSend = async () => {
    const userMessage = input.trim();
    if (!userMessage || isLoading || !chatRef.current) return;

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"; // reset height
    }
    
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setMessages((prev) => [...prev, { role: "model", content: "" }]);
    setIsLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Current SDK might not support abortSignal per-request smoothly via sendMessageStream,
      // but breaking the async iterator stops the connection.
      const streamResponse = await chatRef.current.sendMessageStream({ message: userMessage });
      
      for await (const chunk of streamResponse) {
        if (abortController.signal.aborted) {
          break;
        }
        if (chunk.text) {
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessageIndex = newMessages.length - 1;
            newMessages[lastMessageIndex] = {
              ...newMessages[lastMessageIndex],
              content: newMessages[lastMessageIndex].content + chunk.text,
            };
            return newMessages;
          });
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError" || abortController.signal.aborted) {
        console.log("Stream aborted");
      } else {
        console.error(error);
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessageIndex = newMessages.length - 1;
          newMessages[lastMessageIndex] = {
            ...newMessages[lastMessageIndex],
            content: newMessages[lastMessageIndex].content + `\n\n**Ошибка:** ${error.message || "Упс, что-то пошло не так."}`,
          };
          return newMessages;
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Custom components for ReactMarkdown to handle syntax highlighting
  const renderers: any = React.useMemo(() => ({
    pre(props: any) {
      return <CodeBlock {...props} />;
    },
    code({ node, className, children, ...props }: any) {
      if (!className) {
        return (
          <code {...props} className="bg-[#1f1f25] text-pink-400 px-[0.4rem] py-[0.2rem] rounded-md text-[0.85em] font-mono border border-[#3f3f4e]">
            {children}
          </code>
        );
      }
      return (
        <code {...props} className={className}>
          {children}
        </code>
      );
    },
    a({ node, children, ...props }: any) {
      return <a {...props} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]">{children}</a>;
    }
  }), []);

  return (
    <div className="flex h-screen w-full bg-[#050505] font-sans overflow-hidden text-gray-200">
      
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#09090b] text-gray-300 flex flex-col transition-transform duration-300 ease-in-out border-r border-[#1f1f25]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between p-5 pb-3">
          <div className="flex items-center gap-2.5 font-bold text-white px-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-500 to-pink-600 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.5)]">
               <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="text-[17px] tracking-tight drop-shadow-sm text-gradient-red whitespace-nowrap">GPT ПРУДНИКОВЫХ!</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <button
            onClick={startNewChat}
            className="w-full flex items-center gap-2 bg-[#1f1f25] border border-[#2a2a35] hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] text-white px-4 py-2.5 rounded-xl transition-all font-medium active:scale-[0.98]"
          >
            <PlusCircle size={18} />
            Новый чат
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6 scrollbar-thin scrollbar-thumb-[#2a2a35]">
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-1 drop-shadow-sm">
              Режимы ИИ
            </div>
            <div className="space-y-1.5">
              {(Object.keys(MODES) as Array<keyof typeof MODES>).map((key) => {
                const mode = MODES[key];
                const Icon = mode.icon;
                const isActive = activeMode === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveMode(key)}
                    className={clsx(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium border",
                      isActive ? "bg-[#1f1f25] text-white border-[#3f3f4e] shadow-lg" : "border-transparent hover:bg-white/5 hover:text-gray-100 text-gray-400 hover:border-white/10"
                    )}
                  >
                    <div className={clsx("w-7 h-7 rounded-lg flex items-center justify-center text-white", mode.color)}>
                      <Icon size={14} className={isActive ? "" : "opacity-80"} />
                    </div>
                    {mode.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#1f1f25] text-sm space-y-1">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-3 w-full text-gray-400 hover:text-white transition-colors py-2 px-3 rounded-xl hover:bg-[#1f1f25] hover:border-[#2a2a35] border border-transparent"
          >
            <Settings2 size={18} />
            Настройки
          </button>
          <button 
            onClick={() => setIsClearModalOpen(true)}
            className="flex items-center gap-3 w-full text-pink-500 hover:text-pink-400 transition-colors py-2 px-3 rounded-xl hover:bg-pink-950/20 hover:border-pink-500/30 border border-transparent"
          >
            <Trash2 size={18} />
            Очистить историю
          </button>
        </div>
      </aside>

      {/* Clear Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-opacity">
          <div className="bg-[#0f0f13] border border-[#2a2a35] rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-[0_10px_40px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-2">Очистить историю?</h3>
            <p className="text-gray-400 mb-8 text-[15px] leading-relaxed">
              Вы уверены, что хотите удалить историю сообщений для режима <span className="text-white font-medium">"{MODES[activeMode].name}"</span>? Это действие нельзя отменить.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsClearModalOpen(false)}
                className="flex-1 bg-[#1f1f25] hover:bg-[#2a2a35] text-white py-3 rounded-xl font-medium transition-colors border border-[#3f3f4e]"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  startNewChat();
                  setIsClearModalOpen(false);
                }}
                className="flex-1 bg-pink-600 hover:bg-pink-500 text-white py-3 rounded-xl font-medium transition-colors shadow-[0_0_15px_rgba(236,72,153,0.4)]"
              >
                Очистить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-opacity">
          <div className="bg-[#0f0f13] border border-[#2a2a35] rounded-3xl p-6 md:p-8 max-w-md w-full shadow-[0_10px_40px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-2">Настройки</h3>
            <p className="text-gray-400 mb-6 text-[14px]">
              Здесь вы можете указать свой личный Gemini API ключ, если хотите использовать собственную квоту или деплоите проект на Vercel. Ваш ключ сохраняется локально в браузере.
            </p>
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Gemini API Key
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-[#1f1f25] border border-[#3f3f4e] focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] rounded-xl px-4 py-3 text-white outline-none transition-all"
              />
              <p className="text-xs text-gray-500 mt-2">
                Получить бесплатный ключ можно <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">здесь</a>.
              </p>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-5 py-2.5 bg-[#1f1f25] hover:bg-[#2a2a35] text-white rounded-xl font-medium transition-colors border border-[#3f3f4e]"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  localStorage.setItem("user_gemini_api_key", apiKeyInput);
                  setIsSettingsOpen(false);
                  startNewChat(); // restart with new key!
                }}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-medium transition-colors shadow-[0_0_15px_rgba(34,211,238,0.4)]"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main chat area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#050505] relative text-gray-200">
        <header className="flex-shrink-0 h-16 border-b border-[#1f1f25] flex items-center px-4 justify-between bg-[#050505]/80 backdrop-blur-md z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2.5 -ml-2 text-gray-400 hover:text-gray-200 rounded-xl hover:bg-white/5 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="flex flex-col">
              <span className="font-semibold text-gray-100 text-[15px] drop-shadow-sm">
                {MODES[activeMode].name}
              </span>
              <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
                 Gemini 3.1 Pro <Sparkles size={10} className="text-yellow-500/80 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto w-full pb-44 pt-4" ref={scrollContainerRef}>
          {messages.length === 0 || (messages.length === 1 && messages[0].role === "model" && messages[0].content.startsWith("Привет!")) ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center mt-[-10vh]">
              <div className={clsx("w-20 h-20 rounded-[28px] flex items-center justify-center mb-6", MODES[activeMode].color)}>
                {React.createElement(MODES[activeMode].icon, { size: 36, strokeWidth: 1.5 })}
              </div>
              <h2 className="text-3xl font-bold text-white mb-3 tracking-tight drop-shadow-sm">
                Добро пожаловать в <span className="text-gradient-red whitespace-nowrap">GPT Прудниковых!</span>
              </h2>
              <p className="max-w-md text-gray-400 text-lg leading-relaxed mb-10">Я готов помочь вам с задачами, от крутого кода до креативных идей. Вводите запрос!</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
                {(activeMode === "general" ? [
                  "Объясни квантовую физику",
                  "Секретный рецепт пиццы",
                  "Как подготовиться к собесу?",
                  "Сделай краткую выжимку"
                ] : activeMode === "build" ? [
                  "Напиши Змейку на JS",
                  "Сделай UI дашборда",
                  "Напиши ToDo на React",
                  "Python скрипт парсера"
                ] : [
                  "Идеи для Sci-Fi романа",
                  "Шутка про ITшников",
                  "Стихотворение о весне",
                  "Что если люди летали бы?"
                ]).map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(suggestion);
                      if (textareaRef.current) {
                        textareaRef.current.focus();
                      }
                    }}
                    className="p-4 bg-[#0f0f13] border border-[#2a2a35] hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.15)] rounded-2xl text-left text-sm text-gray-300 hover:text-white transition-all text-ellipsis overflow-hidden whitespace-nowrap"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-2 pb-12 flex flex-col gap-6">
              {messages.map((msg, idx) => (
                <div key={idx} className={clsx("flex gap-4 sm:gap-5 w-full group", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                  <div
                    className={clsx(
                      "w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 mt-0.5",
                      msg.role === "user" ? "bg-[#1f1f25] border border-[#2a2a35] shadow-lg" : MODES[activeMode].color
                    )}
                  >
                    {msg.role === "user" ? <User size={18} className="text-gray-400" /> : <Bot size={20} />}
                  </div>
                  <div className={clsx(
                    "flex-1 min-w-0 break-words",
                    msg.role === "user" 
                      ? "bg-[#0f0f13] px-5 py-3.5 rounded-2xl rounded-tr-sm max-w-[85%] border border-[#1f1f25] shadow-[0_5px_20px_rgba(0,0,0,0.3)]"
                      : "markdown-body py-1.5 w-full group-hover:first-letter:text-inherit" 
                  )}>
                    {msg.role === "user" ? (
                      <div className="whitespace-pre-wrap leading-relaxed text-gray-300 text-[15px]">{msg.content}</div>
                    ) : msg.content === "" && isLoading && idx === messages.length - 1 ? (
                      <FunLoader />
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={renderers}>
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating actions */}
        <div className="absolute bottom-[110px] right-6 sm:right-10 z-20 flex flex-col gap-2">
           <button
             onClick={scrollToBottom}
             className="w-10 h-10 bg-[#1f1f25]/90 backdrop-blur border border-[#2a2a35] text-gray-400 rounded-full flex items-center justify-center shadow-[0_5px_15px_rgba(0,0,0,0.5)] hover:bg-[#2a2a35] hover:text-white transition-all focus:outline-none"
             title="Вниз"
           >
             <ArrowDown size={18} />
           </button>
           
           {showScrollTop && (
             <button
               onClick={scrollToTop}
               className="w-10 h-10 bg-[#1f1f25]/90 backdrop-blur border border-[#2a2a35] text-gray-400 rounded-full flex items-center justify-center shadow-[0_5px_15px_rgba(0,0,0,0.5)] hover:bg-[#2a2a35] hover:text-white transition-all focus:outline-none animate-in fade-in slide-in-from-bottom-2"
               title="Наверх"
             >
               <ArrowUp size={18} />
             </button>
           )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent pt-10 pb-5 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto relative pl-10 pr-2">
            {isLoading && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 bg-[#1f1f25] border border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)] text-gray-200 px-5 py-2 rounded-full text-sm font-medium hover:bg-[#2a2a35] transition-all"
                >
                  <StopCircle size={16} />
                  Остановить
                </button>
              </div>
            )}
            
            <div className={clsx("bg-[#0f0f13] border border-[#2a2a35] rounded-2xl shadow-[0_5px_25px_rgba(0,0,0,0.5)] transition-all flex items-end", MODES[activeMode].color.split(' ').find(c => c.startsWith('border')))}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Спроси меня о чём угодно..."
                className="flex-1 max-h-[250px] min-h-[60px] w-full bg-transparent border-0 outline-none resize-none px-5 py-4 text-gray-200 text-[15px] placeholder:text-gray-500"
                rows={1}
              />
              <div className="p-2 sm:p-2.5 shrink-0">
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={clsx(
                    "w-10 h-10 flex items-center justify-center rounded-xl transition-all",
                    input.trim() && !isLoading
                      ? clsx(MODES[activeMode].color, "text-white cursor-pointer hover:-translate-y-[1px] bg-opacity-80")
                      : "bg-[#1f1f25] text-gray-500 cursor-not-allowed border border-[#2a2a35]"
                  )}
                >
                  {isLoading ? <Loader2 size={20} className="animate-spin text-cyan-400" /> : <Send size={18} className="ml-0.5" />}
                </button>
              </div>
            </div>
            <div className="text-center mt-2.5">
              <span className="text-[11px] text-gray-500 tracking-wide">
                ИИ может ошибаться. Разработано с использованием Gemini 3.1 Pro.
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

