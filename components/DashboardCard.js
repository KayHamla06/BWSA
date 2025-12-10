export default function DashboardCard({ title, value, icon: Icon, trend, color = 'emerald' }) {
  const colorClass = {
    emerald: 'text-emerald-500',
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    orange: 'text-orange-500',
  }[color];

  return (
    <div className="glass rounded-xl p-6 card-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{title}</p>
          <h3 className="text-3xl font-bold mt-2">{value}</h3>
          {trend && (
            <p className={`text-sm mt-2 ${trend.positive ? 'text-emerald-500' : 'text-red-500'}`}>
              {trend.positive ? '📈' : '📉'} {trend.text}
            </p>
          )}
        </div>
        {Icon && <Icon className={`${colorClass} opacity-20`} size={48} />}
      </div>
    </div>
  );
}