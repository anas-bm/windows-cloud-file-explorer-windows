import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface DriveUsageChartProps {
  isDark?: boolean;
}

const DriveUsageChart: React.FC<DriveUsageChartProps> = ({ isDark = false }) => {
  const data = [
    { name: 'Used', value: 450, color: '#3B82F6' },
    { name: 'Free', value: 574, color: isDark ? '#374151' : '#E5E7EB' },
  ];

  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  const used = data.find(d => d.name === 'Used')?.value || 0;
  const percentage = Math.round((used / total) * 100);

  return (
    <div className={`w-full rounded-xl p-4 flex flex-col items-center justify-center relative transition-colors duration-300 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white/40 border border-white/20 shadow-sm'}`}>
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-1">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Local Disk (C:)
        </span>
      </div>

      {/* Chart Area */}
      <div className="w-full h-32 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="75%"
              innerRadius={50}
              outerRadius={65}
              startAngle={180}
              endAngle={0}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
                cursor={false}
                contentStyle={{ 
                    borderRadius: '8px', 
                    border: isDark ? '1px solid #374151' : 'none', 
                    backgroundColor: isDark ? '#1F2937' : 'rgba(255, 255, 255, 0.9)',
                    color: isDark ? 'white' : 'black',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    padding: '8px 12px'
                }}
                itemStyle={{ color: isDark ? '#E5E7EB' : '#374151' }}
                formatter={(value: number) => [`${value} GB`, null]}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center Text */}
        <div className={`absolute bottom-5 left-0 right-0 text-center flex flex-col items-center justify-center pointer-events-none`}>
            <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{percentage}%</span>
        </div>
      </div>

      {/* Footer Text */}
      <div className={`text-[10px] mt-[-10px] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          <span className="font-semibold text-blue-500">450 GB</span> used of 1.02 TB
      </div>
    </div>
  );
};

export default DriveUsageChart;