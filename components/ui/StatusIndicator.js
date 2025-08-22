export default function StatusIndicator({ status = "OFFLINE", size = "md" }) {
  const sizeClasses = {
    xs: "w-2 h-2",
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const colorClasses = {
    ONLINE: "bg-green-500",
    AWAY: "bg-yellow-500",
    OFFLINE: "bg-gray-500",
  };

  return (
    <div
      className={`rounded-full ${sizeClasses[size]} ${
        colorClasses[status] || colorClasses.OFFLINE
      }`}
    />
  );
}
