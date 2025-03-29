import Image from "next/image";
import Header from './components/Header';
import Footer from './components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Welcome to Extern</h1>
        <p className="mb-4">Your application is ready to be built.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-semibold mb-2">Feature One</h2>
            <p>Description of your first main feature goes here.</p>
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-semibold mb-2">Feature Two</h2>
            <p>Description of your second main feature goes here.</p>
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-semibold mb-2">Feature Three</h2>
            <p>Description of your third main feature goes here.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
