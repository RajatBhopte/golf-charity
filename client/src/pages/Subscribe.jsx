import Navbar from '../components/Navbar';

export default function Subscribe() {
  return (
    <div className="min-h-screen bg-dark-bg text-white">
      <Navbar />
      <main className="p-8 pt-24 max-w-lg mx-auto text-center">
        <h1 className="text-3xl font-bold mb-4 text-brand-500">Subscription Required</h1>
        <p className="text-gray-400 mb-8">
          You need an active subscription to access the dashboard. (Phase 3 Placeholder)
        </p>
        <button className="btn-primary w-full py-4">
          Proceed to Checkout (Coming Soon)
        </button>
      </main>
    </div>
  );
}
