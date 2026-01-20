import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sector
} from 'recharts';

interface ChartCardProps {
  title: string;
  description?: string;
  type: 'area' | 'bar' | 'pie';
  data: any[];
  dataKey?: string;
  categories?: string[];
  colors?: string[];
  className?: string;
}

export function ChartCard({
  title,
  description,
  type,
  data,
  dataKey = 'value',
  categories = ['categoria'],
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
  className
}: ChartCardProps) {
  const [activeIndex, setActiveIndex] = React.useState(-1);

  // Função para renderizar o setor ativo no gráfico de pizza quando hover
  const renderActiveShape = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    // Formatação de valor monetário
    const formattedValue = new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(Number(value));

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6} // Efeito de expansão ao passar o mouse
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.9}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 8}
          outerRadius={outerRadius + 12}
          fill={fill}
          opacity={0.4}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={2} />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey - 12} textAnchor={textAnchor} fill="#333" fontSize={12}>{payload.name}</text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey + 6} textAnchor={textAnchor} fill="#666" fontSize={12}>
          {formattedValue}
        </text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey + 24} textAnchor={textAnchor} fill="#999" fontSize={11}>
          {`(${(percent * 100).toFixed(0)}%)`}
        </text>
      </g>
    );
  };

  // Cores mais modernas e vibrantes para o gráfico de pizza
  const modernPieColors = [
    '#4361ee', '#3a0ca3', '#7209b7', '#f72585', '#4cc9f0', '#4895ef', 
    '#560bad', '#d00000', '#ff9e00', '#38b000'
  ];

  // Cores modernas para o gráfico de barras
  const modernBarColors = [
    '#4361ee', '#3a0ca3', '#7209b7', '#4cc9f0', '#4895ef', '#560bad'
  ];

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(-1);
  };

  const renderChart = () => {
    switch (type) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 6, bottom: 0 }}
            >
              <defs>
                {categories.map((category, index) => (
                  <linearGradient key={category} id={`color-${category}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors[index % colors.length]} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={colors[index % colors.length]} stopOpacity={0.1} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#666' }}
                tickFormatter={(value) => 
                  value >= 1000 ? `${Math.round(value / 1000)}k` : value
                }
              />
              <Tooltip 
                formatter={(value) => new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                }).format(Number(value))}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                  border: 'none',
                  padding: '12px'
                }}
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
              />
              <Legend />
              {categories.map((category, index) => (
                <Area
                  key={category}
                  type="monotone"
                  dataKey={category}
                  stroke={colors[index % colors.length]}
                  fillOpacity={1}
                  fill={`url(#color-${category})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              barGap={8}
              barSize={26}
            >
              <defs>
                {categories.map((category, index) => (
                  <linearGradient 
                    key={`barGradient-${category}`} 
                    id={`barGradient-${category}`} 
                    x1="0" 
                    y1="0" 
                    x2="0" 
                    y2="1"
                  >
                    <stop 
                      offset="0%" 
                      stopColor={modernBarColors[index % modernBarColors.length]} 
                      stopOpacity={0.9}
                    />
                    <stop 
                      offset="95%" 
                      stopColor={modernBarColors[index % modernBarColors.length]} 
                      stopOpacity={0.6}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false} 
                stroke="#f0f0f0" 
              />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#666', fontWeight: 500 }}
                padding={{ left: 10, right: 10 }}
                tickFormatter={(value) => 
                  value.length > 10 ? `${value.substring(0, 10)}...` : value
                }
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#666' }}
                tickFormatter={(value) => 
                  value >= 1000 ? `${Math.round(value / 1000)}k` : value
                }
              />
              <Tooltip 
                formatter={(value) => new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                }).format(Number(value))}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                  border: 'none',
                  padding: '12px'
                }}
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
              />
              <Legend 
                iconType="circle" 
                iconSize={10}
                wrapperStyle={{ paddingTop: 15 }}
              />
              {categories.map((category, index) => (
                <Bar
                  key={category}
                  dataKey={category}
                  fill={`url(#barGradient-${category})`}
                  radius={[4, 4, 0, 0] as any}
                  background={{ fill: '#f5f5f5', radius: [4, 4, 0, 0] as any }}
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <defs>
                {modernPieColors.map((color, index) => (
                  <linearGradient key={`gradient-${index}`} id={`pieGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                    <stop offset="100%" stopColor={`${color}dd`} stopOpacity={0.8} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60} // Transformando em um gráfico de rosca (donut)
                outerRadius={80}
                paddingAngle={2} // Espaçamento entre fatias
                dataKey={dataKey}
                nameKey="name"
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
                animationBegin={100}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#pieGradient-${index % modernPieColors.length})`} 
                    stroke={modernPieColors[index % modernPieColors.length]}
                    strokeWidth={1}
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))} 
                labelFormatter={(name) => name}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                  border: 'none',
                  padding: '12px'
                }}
              />
              <Legend 
                layout="vertical" 
                verticalAlign="middle" 
                align="right"
                iconType="circle"
                formatter={(value, entry, index) => {
                  // Truncar nomes muito longos
                  return value.length > 15 ? value.substring(0, 15) + '...' : value;
                }}
                wrapperStyle={{
                  paddingLeft: '20px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </CardHeader>
      )}
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
} 