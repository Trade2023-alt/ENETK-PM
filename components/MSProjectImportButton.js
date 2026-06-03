'use client';

import { useState, useRef } from 'react';
import { Upload, FileCode, Check, AlertTriangle, HelpCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function MSProjectImportButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [parsedTasks, setParsedTasks] = useState([]);
    const [importSummary, setImportSummary] = useState({ jobsCreated: 0, subtasksCreated: 0 });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        setError('');
        setSuccess(false);
        setParsedTasks([]);

        if (file.name.endsWith('.mpp')) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                
                const response = await fetch('/api/mpp', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                if (data.error) {
                    throw new Error(data.error);
                }
                
                if (data.tasks && data.tasks.length > 0) {
                    setParsedTasks(data.tasks);
                } else {
                    throw new Error('No tasks returned by parser.');
                }
            } catch (err) {
                console.error(err);
                setError(err.message || 'Failed to parse MPP file. Verify Docker service is running.');
            } finally {
                setIsParsing(false);
            }
            return;
        }

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const text = evt.target?.result;
                if (file.name.endsWith('.xml')) {
                    parseXMLProject(text);
                } else if (file.name.endsWith('.csv')) {
                    parseCSVProject(text);
                } else {
                    throw new Error('Unsupported file extension. Please upload an XML, CSV, or MPP file.');
                }
            } catch (err) {
                console.error(err);
                setError(err.message || 'Failed to parse file.');
                setIsParsing(false);
            }
        };
        reader.readAsText(file);
    };

    const parseXMLProject = (xmlText) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // Check for XML parsing error
        const parserError = xmlDoc.getElementsByTagName('parsererror')[0];
        if (parserError) {
            throw new Error('Invalid XML file. Please export as MS Project XML.');
        }

        const tasksNode = xmlDoc.getElementsByTagName('Tasks')[0];
        if (!tasksNode) {
            throw new Error('Could not find any tasks in the MS Project XML file.');
        }

        const tasksList = tasksNode.getElementsByTagName('Task');
        const tasks = [];

        for (let i = 0; i < tasksList.length; i++) {
            const taskNode = tasksList[i];
            
            // Skip summary task if outline level is 0
            const outlineLevelStr = taskNode.getElementsByTagName('OutlineLevel')[0]?.textContent || '1';
            const outlineLevel = parseInt(outlineLevelStr);
            if (outlineLevel === 0) continue;

            const name = taskNode.getElementsByTagName('Name')[0]?.textContent || 'Unnamed Task';
            const start = taskNode.getElementsByTagName('Start')[0]?.textContent?.split('T')[0] || '';
            const finish = taskNode.getElementsByTagName('Finish')[0]?.textContent?.split('T')[0] || '';
            const durationStr = taskNode.getElementsByTagName('Duration')[0]?.textContent || 'PT0H0M0S';
            
            let hours = 0;
            const hoursMatch = durationStr.match(/PT(\d+)H/);
            if (hoursMatch) hours = parseInt(hoursMatch[1]);

            const uid = taskNode.getElementsByTagName('UID')[0]?.textContent || String(i);
            const isJob = outlineLevel === 1;

            const parsedTask = {
                uid,
                name,
                start,
                finish,
                hours,
                isJob,
                outlineLevel,
                tempId: i
            };

            tasks.push(parsedTask);
        }

        if (tasks.length === 0) {
            throw new Error('No valid tasks found to import.');
        }

        setParsedTasks(tasks);
        setIsParsing(false);
    };

    const parseCSVProject = (csvText) => {
        const lines = csvText.split('\n');
        if (lines.length < 2) {
            throw new Error('CSV file is empty or invalid.');
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const tasks = [];

        const nameIdx = headers.findIndex(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('title'));
        const startIdx = headers.findIndex(h => h.toLowerCase().includes('start'));
        const finishIdx = headers.findIndex(h => h.toLowerCase().includes('finish') || h.toLowerCase().includes('end'));
        const durationIdx = headers.findIndex(h => h.toLowerCase().includes('duration') || h.toLowerCase().includes('work'));
        const outlineIdx = headers.findIndex(h => h.toLowerCase().includes('outline') || h.toLowerCase().includes('level') || h.toLowerCase().includes('indent'));

        if (nameIdx === -1) {
            throw new Error('CSV must contain a "Name" or "Title" column.');
        }

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const rawCols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (rawCols.length <= nameIdx) continue;

            const rawName = rawCols[nameIdx] || '';
            // Strip surrounding quotes to look at leading spaces of the raw cell content
            const nameWithoutQuotes = rawName.replace(/^["']|["']$/g, '');
            const leadingSpaces = nameWithoutQuotes.match(/^\s*/)[0].length;

            const cols = rawCols.map(c => c.trim().replace(/"/g, ''));
            const name = cols[nameIdx] || 'Unnamed Task';
            const start = cols[startIdx] ? cols[startIdx].split(' ')[0] : '';
            const finish = cols[finishIdx] ? cols[finishIdx].split(' ')[0] : '';
            const duration = cols[durationIdx] || '0';
            const hours = parseFloat(duration.replace(/[^\d.]/g, '')) || 0;

            // Compute outline level from header column or indentation
            let outlineLevel = 1;
            if (outlineIdx !== -1 && cols[outlineIdx]) {
                outlineLevel = parseInt(cols[outlineIdx].replace(/[^\d]/g, '')) || 1;
            } else if (leadingSpaces > 0) {
                outlineLevel = Math.floor(leadingSpaces / 2) + 1;
            }

            tasks.push({
                uid: String(i),
                name: name.trim(),
                start,
                finish,
                hours,
                isJob: outlineLevel === 1,
                outlineLevel,
                tempId: i
            });
        }

        if (tasks.length === 0) {
            throw new Error('No valid CSV tasks found.');
        }

        setParsedTasks(tasks);
        setIsParsing(false);
    };

    const handleImportConfirm = async () => {
        setIsParsing(true);
        setError('');
        let jobsCreatedCount = 0;
        let subtasksCreatedCount = 0;

        try {
            const maxOutline = Math.max(...parsedTasks.map(t => t.outlineLevel || 1));
            const isHierarchical = maxOutline >= 3;

            if (isHierarchical) {
                // --- HIERARCHICAL MODE ---
                // Customer (1) > Subtasks container (2) > Job (3) > Task (4) > Subtask (5+)
                let currentCustomerId = null;
                let currentJobId = null;
                let lastLevel4Title = '';
                let fallbackCustomerId = null;

                for (const task of parsedTasks) {
                    const outline = task.outlineLevel || 1;

                    if (outline === 1) {
                        // Level 1: Customer Name
                        const customerName = task.name.trim();
                        
                        // Find or create customer
                        const { data: customer } = await supabase
                            .from('customers')
                            .select('id')
                            .eq('name', customerName)
                            .maybeSingle();

                        if (customer) {
                            currentCustomerId = customer.id;
                        } else {
                            const { data: newCustomer, error: cErr } = await supabase
                                .from('customers')
                                .insert([{ name: customerName, address: 'Imported Customer' }])
                                .select('id')
                                .single();
                            if (cErr) throw cErr;
                            currentCustomerId = newCustomer.id;
                        }
                    } 
                    else if (outline === 2) {
                        // Level 2: Sub-tasks container folder (skip database creation)
                        continue;
                    } 
                    else if (outline === 3) {
                        // Level 3: Job Name
                        if (!currentCustomerId) {
                            if (!fallbackCustomerId) {
                                const { data: fallbackCust, error: fcErr } = await supabase
                                    .from('customers')
                                    .insert([{ name: 'MS Project Import', address: 'Imported from Microsoft Project' }])
                                    .select('id')
                                    .single();
                                if (fcErr) throw fcErr;
                                fallbackCustomerId = fallbackCust.id;
                            }
                            currentCustomerId = fallbackCustomerId;
                        }

                        // Create Job
                        const { data: job, error: jErr } = await supabase
                            .from('jobs')
                            .insert([
                                {
                                    title: task.name,
                                    description: `Imported Job. Start: ${task.start}, End: ${task.finish}`,
                                    scheduled_date: task.start || new Date().toISOString().split('T')[0],
                                    estimated_hours: task.hours || 8,
                                    actual_hours: 0,
                                    status: 'Scheduled',
                                    customer_id: currentCustomerId
                                }
                            ])
                            .select('id')
                            .single();

                        if (jErr) throw jErr;
                        currentJobId = job.id;
                        jobsCreatedCount++;
                    } 
                    else if (outline === 4) {
                        // Level 4: Task Name
                        if (!currentJobId) {
                            // Fallback Job if none created yet
                            const { data: fallbackJob, error: fjErr } = await supabase
                                .from('jobs')
                                .insert([
                                    {
                                        title: 'MS Project Imported Group',
                                        description: 'Parent job for orphans',
                                        scheduled_date: task.start || new Date().toISOString().split('T')[0],
                                        estimated_hours: 8,
                                        actual_hours: 0,
                                        status: 'Scheduled',
                                        customer_id: currentCustomerId || fallbackCustomerId
                                    }
                                ])
                                .select('id')
                                .single();
                            if (fjErr) throw fjErr;
                            currentJobId = fallbackJob.id;
                            jobsCreatedCount++;
                        }

                        lastLevel4Title = task.name;

                        // Insert as sub-task
                        const { error: stErr } = await supabase
                            .from('sub_tasks')
                            .insert([
                                {
                                    job_id: currentJobId,
                                    title: task.name,
                                    status: 'Pending'
                                }
                            ]);

                        if (stErr) throw stErr;
                        subtasksCreatedCount++;
                    } 
                    else if (outline >= 5) {
                        // Level 5+: Subtask Name
                        if (!currentJobId) continue;

                        const taskTitle = lastLevel4Title ? `${lastLevel4Title} - ${task.name}` : task.name;

                        const { error: stErr } = await supabase
                            .from('sub_tasks')
                            .insert([
                                {
                                    job_id: currentJobId,
                                    title: taskTitle,
                                    status: 'Pending'
                                }
                            ]);

                        if (stErr) throw stErr;
                        subtasksCreatedCount++;
                    }
                }
            } else {
                // --- ORIGINAL FLAT MODE ---
                let customerId = null;
                const { data: customer } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('name', 'MS Project Import')
                    .maybeSingle();

                if (customer) {
                    customerId = customer.id;
                } else {
                    const { data: newCustomer, error: cErr } = await supabase
                        .from('customers')
                        .insert([{ name: 'MS Project Import', address: 'Imported from Microsoft Project' }])
                        .select('id')
                        .single();
                    if (cErr) throw cErr;
                    customerId = newCustomer.id;
                }

                const uidToJobIdMap = {};
                let lastJobId = null;

                for (const task of parsedTasks) {
                    if (task.isJob) {
                        const { data: job, error: jErr } = await supabase
                            .from('jobs')
                            .insert([
                                {
                                    title: task.name,
                                    description: `Imported MS Project Task. Start: ${task.start}, End: ${task.finish}`,
                                    scheduled_date: task.start || new Date().toISOString().split('T')[0],
                                    estimated_hours: task.hours || 8,
                                    actual_hours: 0,
                                    status: 'Scheduled',
                                    customer_id: customerId
                                }
                            ])
                            .select('id')
                            .single();

                        if (jErr) throw jErr;
                        
                        uidToJobIdMap[task.uid] = job.id;
                        lastJobId = job.id;
                        jobsCreatedCount++;
                    } else {
                        let targetJobId = lastJobId;
                        
                        if (!targetJobId) {
                            const { data: parentJob, error: pjErr } = await supabase
                                .from('jobs')
                                .insert([
                                    {
                                        title: 'MS Project Imported Group',
                                        description: 'Parent job for orphans',
                                        scheduled_date: task.start || new Date().toISOString().split('T')[0],
                                        estimated_hours: 8,
                                        actual_hours: 0,
                                        status: 'Scheduled',
                                        customer_id: customerId
                                    }
                                ])
                                .select('id')
                                .single();
                            if (pjErr) throw pjErr;
                            targetJobId = parentJob.id;
                            lastJobId = parentJob.id;
                            jobsCreatedCount++;
                        }

                        const { error: stErr } = await supabase
                            .from('sub_tasks')
                            .insert([
                                {
                                    job_id: targetJobId,
                                    title: task.name,
                                    status: 'Pending'
                                }
                            ]);

                        if (stErr) throw stErr;
                        subtasksCreatedCount++;
                    }
                }
            }

            setImportSummary({ jobsCreated: jobsCreatedCount, subtasksCreated: subtasksCreatedCount });
            setSuccess(true);
            setParsedTasks([]);
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (err) {
            console.error('Import Error:', err);
            setError(err.message || 'Database error occurred during import.');
        } finally {
            setIsParsing(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="btn flex items-center gap-2"
                style={{
                    background: 'rgba(255, 255, 255, 0.55)',
                    border: '1px solid var(--glass-border)',
                }}
            >
                <Upload size={16} /> Import MS Project
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4 text-slate-800">
                    <div className="card w-full max-w-xl bg-white flex flex-col gap-6 shadow-2xl relative z-[1200] border border-slate-200">
                        <div className="border-b pb-3 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <FileCode className="text-rose-800" size={24} />
                                <h3 className="text-xl font-bold text-rose-900">Import Microsoft Project Schedule</h3>
                            </div>
                            <button onClick={() => { setIsOpen(false); setError(''); setSuccess(false); setParsedTasks([]); }} className="text-slate-500 hover:text-slate-700">
                                ✕
                            </button>
                        </div>

                        {!success ? (
                            <div className="space-y-4">
                                <div className="bg-slate-50 p-4 rounded-xl border flex gap-3 text-slate-600 text-sm">
                                    <HelpCircle className="text-rose-800 flex-shrink-0" size={20} />
                                    <div className="space-y-1">
                                        <span className="font-bold text-slate-800 block">Supported MS Project Formats:</span>
                                        <p>• <strong>Binary (.mpp)</strong>: Upload directly if the Docker parser microservice is running.</p>
                                        <p>• <strong>XML Export (*.xml)</strong>: Recommended. In MS Project, choose Save As &gt; XML Format (*.xml).</p>
                                        <p>• <strong>CSV Export</strong>: Recreates flat task tables.</p>
                                    </div>
                                </div>

                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center flex flex-col items-center gap-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                    <Upload size={32} className="text-rose-800" />
                                    <div className="text-sm font-semibold text-slate-700">
                                        Upload MS Project MPP, XML, or CSV Schedule file
                                    </div>
                                    <input
                                        type="file"
                                        accept=".mpp,.xml,.csv"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="btn btn-primary"
                                        disabled={isParsing}
                                    >
                                        {isParsing ? 'Processing File...' : 'Choose File'}
                                    </button>
                                </div>

                                {error && (
                                    <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-red-700 text-sm flex gap-2">
                                        <AlertTriangle size={18} className="flex-shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {parsedTasks.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="text-sm font-bold text-slate-700">
                                            Ready to import {parsedTasks.length} tasks:
                                        </div>
                                        <div className="max-h-48 overflow-y-auto border rounded-lg bg-slate-50 p-3 divide-y text-xs font-mono">
                                            {parsedTasks.slice(0, 10).map((t, idx) => (
                                                <div key={idx} className="py-1 flex justify-between">
                                                    <span className={t.isJob ? 'font-bold' : 'text-slate-500 pl-4'}>
                                                        {t.isJob ? '💼 ' : '• '}{t.name}
                                                    </span>
                                                    <span className="text-slate-400">
                                                        {t.hours} hrs | {t.start}
                                                    </span>
                                                </div>
                                            ))}
                                            {parsedTasks.length > 10 && (
                                                <div className="py-2 text-center text-slate-400 text-[10px]">
                                                    ...and {parsedTasks.length - 10} more tasks
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={handleImportConfirm}
                                            className="w-full btn btn-primary flex items-center justify-center gap-2"
                                            disabled={isParsing}
                                        >
                                            <Check size={18} /> Confirm Import to Database
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8 flex flex-col items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                    <Check size={28} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-lg font-bold text-slate-800">Schedule Imported Successfully!</h4>
                                    <p className="text-sm text-slate-500">
                                        Created {importSummary.jobsCreated} Main Jobs and {importSummary.subtasksCreated} Sub-Tasks.
                                    </p>
                                    <p className="text-xs text-rose-800 font-semibold animate-pulse pt-2">
                                        Refreshing schedule view...
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
