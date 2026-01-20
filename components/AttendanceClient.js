'use client'

import { useState, useEffect } from 'react';
import AttendancePieCharts from './AttendancePieCharts';
import AttendanceTrendChart from './AttendanceTrendChart';

export default function AttendanceClient({ initialTrendData, initialMetricsData, users }) {
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [trendData, setTrendData] = useState(initialTrendData);
    const [metricsData, setMetricsData] = useState(initialMetricsData);
    const [loading, setLoading] = useState(false);

    const handleDateChange = async () => {
        // For now, the filtering is done client-side by filtering the existing data
        // In a production app, you'd want to refetch from server with new dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Filter chart data by date range
        const filteredChartData = initialTrendData.chartData.filter(d => {
            const date = new Date(d.date);
            return date >= start && date <= end;
        });

        setTrendData({ ...initialTrendData, chartData: filteredChartData });
    };

    useEffect(() => {
        handleDateChange();
    }, [startDate, endDate]);

    return (
        <div>
            {/* Date Range Filters */}
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>📅 Date Range:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem' }}>From:</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="input"
                            style={{ width: 'auto', padding: '0.4rem', fontSize: '0.85rem' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem' }}>To:</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="input"
                            style={{ width: 'auto', padding: '0.4rem', fontSize: '0.85rem' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => {
                                const d = new Date();
                                d.setDate(d.getDate() - 7);
                                setStartDate(d.toISOString().split('T')[0]);
                                setEndDate(new Date().toISOString().split('T')[0]);
                            }}
                            className="btn"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                        >
                            Last 7 Days
                        </button>
                        <button
                            onClick={() => {
                                const d = new Date();
                                d.setDate(d.getDate() - 30);
                                setStartDate(d.toISOString().split('T')[0]);
                                setEndDate(new Date().toISOString().split('T')[0]);
                            }}
                            className="btn"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                        >
                            Last 30 Days
                        </button>
                        <button
                            onClick={() => {
                                const d = new Date();
                                d.setDate(d.getDate() - 90);
                                setStartDate(d.toISOString().split('T')[0]);
                                setEndDate(new Date().toISOString().split('T')[0]);
                            }}
                            className="btn"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                        >
                            Last 90 Days
                        </button>
                    </div>
                </div>
            </div>

            {/* Pie Charts Section */}
            <AttendancePieCharts
                metrics={metricsData}
                startDate={startDate}
                endDate={endDate}
            />

            {/* Hours Trend Chart */}
            <AttendanceTrendChart
                chartData={trendData.chartData}
                users={users}
            />
        </div>
    );
}
