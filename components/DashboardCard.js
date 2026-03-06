'use client';

export default function DashboardCard({ title, value, icon: Icon, color = 'emerald' }) {
  const colorMap = {
    emerald: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
    blue: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
    purple: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
    orange: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20',
  };

  return (
    <div className="glass rounded-xl p-6 card-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg ${colorMap[color] || colorMap.emerald}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}
