"use client";

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: "blue" | "green" | "amber";
}

const colorMap = {
  blue: {
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
  },
  green: {
    bg: "bg-green-50",
    iconBg: "bg-green-100",
    iconText: "text-green-600",
  },
  amber: {
    bg: "bg-amber-50",
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
  },
};

export default function StatsCard({ title, value, icon, color }: StatsCardProps) {
  const c = colorMap[color];
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${c.iconBg} ${c.iconText}`}>
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">{title}</div>
          <div className="mt-0.5 text-2xl font-semibold text-gray-900">{value}</div>
        </div>
      </div>
    </div>
  );
}
