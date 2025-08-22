export default function Redirect({ message = "Redirecting..." }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      <div className="ml-4 text-white">{message}</div>
    </div>
  );
}
