import MTOForm from "../../components/MTOForm";
import ChatWidget from "../../components/ChatWidget";

export default function EstimatePage() {
  return (
    <main className="min-h-screen p-8 relative pb-32">
      <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-12">
        <header className="flex justify-between items-center glass-panel p-6 rounded-2xl shadow-lg">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-rose-500">
              Estimation <span className="text-rose-300">Pro</span>
            </h1>
            <p className="text-gray-300 mt-1 font-medium">Automation and Electrical Estimation Software</p>
          </div>
          <div className="flex gap-4">
            <button className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-rose-500 border border-rose-900/40 font-bold transition-colors">
              Projects Dashboard
            </button>
            <button className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-white shadow-md font-bold transition-all">
              New Estimate
            </button>
          </div>
        </header>

        {/* Main Application Area */}
        <MTOForm />
      </div>

      {/* Floating AI Chatbot */}
      <ChatWidget />
    </main>
  );
}
