/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, Dispatch, SetStateAction } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Room, Reservation, MaintenanceTicket } from '../types';

interface AiAgentTabProps {
  rooms: Room[];
  reservations: Reservation[];
  tickets: MaintenanceTicket[];
}

interface ReportData {
  title: string;
  subtitle: string;
  generatedAt: string;
  executiveSummary: string;
  performanceDonutValue: number;
  performanceDonutLabel: string;
  performanceDonutComment: string;
  statLeftVal: number;
  statLeftLabel: string;
  statLeftDesc: string;
  statRightVal: number;
  statRightLabel: string;
  statRightDesc: string;
  splitBarHeader: string;
  splitBarLeftLabel: string;
  splitBarLeftVal: number;
  splitBarRightLabel: string;
  splitBarRightVal: number;
  categoryScores: Array<{ label: string; score: number; text: string }>;
  gridHighlightVal: number;
  gridHighlightLabel: string;
  gridHighlightDesc: string;
  recommendations: string[];
}

export default function AiAgentTab({ rooms, reservations, tickets }: AiAgentTabProps) {
  const [selectedFocus, setSelectedFocus] = useState<string>('Operational Balance');
  const [customBrief, setCustomBrief] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [report, setReport] = useState<ReportData | null>(null);

  const focusOptions = [
    { id: 'Operational Balance', label: 'Overall Operations Audit', desc: 'Evaluates general room occupancy, housekeeping turnaround speeds, and facility ticket backlogs.' },
    { id: 'High Maintenance Alert', label: 'Preventive Facilities Audit', desc: 'Focuses heavily on plumbing, wifi, and electrical repairs, optimizing inventory restoration lines.' },
    { id: 'VIP Operations Plan', label: 'VIP Logistics & Guest Experience Brief', desc: 'Prioritizes signature penthouse suites readiness, hypoallergenic compliance, and guest stayover feedback.' },
    { id: 'Custom Analysis', label: 'Specify Custom Focus Brief...', desc: '' }
  ];

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setReport(null);

    const steps = [
      'Assembling live hotel matrices (Rooms, Tickets, Bookings)...',
      'Establishing connection to server-side Tranquil 3.5 Operational Intelligence...',
      'Auditing suite turnaround benchmarks and service log compliance metrics...',
      'Structuring layout coordinates to match Swiss-editorial display formats...',
      'Fusing predictive recommendations with GM operational action points...'
    ];

    let currentStep = 0;
    setLoadingStep(steps[0]);
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setLoadingStep(steps[currentStep]);
      }
    }, 1200);

    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelState: {
            rooms,
            reservations,
            tickets,
            focus: selectedFocus,
            customBrief: selectedFocus === 'Custom Analysis' ? customBrief : undefined
          }
        })
      });

      if (!response.ok) {
        throw new Error('Server-side Tranquil generation failed.');
      }

      const data = await response.json();
      setReport(data);
    } catch (err) {
      console.error(err);
      alert('Operational Intelligence: Tranquil returned an error, using optimized pre-calibrated baseline.');
    } finally {
      clearInterval(interval);
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // PDF Generation using a beautiful dedicated printable layout window
  const handlePrintPDF = () => {
    if (!report) return;
    
    // Set up dedicated HTML print window that formats everything perfectly
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to utilize the high-fidelity print-to-PDF pipeline.');
      return;
    }

    // Direct Tailwind styles injection for pristine rendering inside the printing iframe/tab
    printWindow.document.write(`
      <html>
        <head>
          <title>${report.title} - PDF Version</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Inter', sans-serif;
              background-color: #f5f0eb;
              color: #1e1e1e;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .font-display {
              font-family: 'Space Grotesk', sans-serif;
            }
            @media print {
              body {
                background-color: #f5f0eb !important;
                margin: 0;
                padding: 1.5cm;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body class="p-8 max-w-[21cm] mx-auto min-h-[29.7cm] flex flex-col justify-between">
          <div>
            <!-- Print Controls Header -->
            <div class="no-print bg-black text-white p-4 rounded-lg flex justify-between items-center mb-8 shadow-md">
              <span class="text-xs font-bold font-mono tracking-wider">TRANQUIL HAVEN - INTEL ENGINE GENERATOR v3.5 (PDF PREVIEW)</span>
              <button onclick="window.print()" class="bg-amber-100 hover:bg-amber-200 text-black px-4 py-2 rounded font-black text-xs uppercase tracking-widest cursor-pointer">
                Confirm & Download PDF
              </button>
            </div>

            <!-- Page Layout Sheet matching benchmark -->
            <div class="relative bg-[#f5f0eb] border border-black/10 rounded-sm p-8 flex gap-8">
              
              <!-- Left Sidebar vertical label -->
              <div class="w-12 bg-black text-[#f5f0eb] py-8 flex flex-col items-center justify-between uppercase tracking-[0.4em] text-[10px] select-none font-display">
                <span style="writing-mode: vertical-rl; transform: rotate(180deg);" class="font-bold">Tranquil Haven Reports</span>
                <span style="writing-mode: vertical-rl; transform: rotate(180deg);" class="text-amber-200 mt-8 font-black">LOGISTICS AUDIT</span>
              </div>

              <!-- Main Sheet Body -->
              <div class="flex-1 space-y-6">
                <!-- Header Ribbon -->
                <div class="border-b border-black pb-4">
                  <p class="text-[9px] font-bold tracking-[0.25em] text-black/60 uppercase">
                    BUILDING THE BRIDGE BETWEEN COMFORT AND REAL-TIME LOGISTICS
                  </p>
                  <h1 class="font-display font-black text-4xl text-black leading-none mt-2">
                    ${report.title}
                  </h1>
                  <p class="text-[11px] font-bold tracking-wider text-black/80 mt-1 uppercase">
                    ${report.subtitle}
                  </p>
                  <p class="text-[10px] font-mono text-black/50 mt-1">
                    System Autographed: ${report.generatedAt}
                  </p>
                </div>

                <!-- Executive Summary section -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div class="md:col-span-2 space-y-3 pr-4 border-r border-black/10">
                    <h3 class="font-display font-black text-sm tracking-widest uppercase text-black">
                      Executive Evaluation
                    </h3>
                    <p class="text-xs leading-relaxed text-black/80 whitespace-pre-line font-medium">
                      ${report.executiveSummary}
                    </p>
                  </div>

                  <!-- Right Stats Panel with big donut chart -->
                  <div class="flex flex-col justify-between space-y-6 bg-black/5 p-4 rounded border border-black/5">
                    <div class="text-center">
                      <span class="text-[10px] font-black uppercase tracking-wider text-black/60 font-display">
                        ${report.performanceDonutLabel}
                      </span>
                      
                      <!-- Donut shape SVG -->
                      <div class="relative w-28 h-28 mx-auto my-4 flex items-center justify-center">
                        <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path class="text-neutral-300" stroke-width="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          <path class="text-black" stroke-dasharray="${report.performanceDonutValue}, 100" stroke-width="3.5" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <span class="absolute text-2xl font-display font-black text-black">
                          ${report.performanceDonutValue}%
                        </span>
                      </div>
                    </div>
                    <p class="text-[11px] leading-relaxed text-black/80 text-center italic">
                      ${report.performanceDonutComment}
                    </p>
                  </div>
                </div>

                <!-- Mid split sections -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-b border-black py-4">
                  <!-- Sub donut metric left -->
                  <div class="flex items-center gap-3">
                    <div class="relative w-12 h-12 flex-shrink-0 flex items-center justify-center">
                      <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path class="text-black/10" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path class="text-black" stroke-dasharray="${report.statLeftVal}, 100" stroke-width="3" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <span class="absolute text-xs font-display font-black">${report.statLeftVal}%</span>
                    </div>
                    <div>
                      <h4 class="text-[10px] font-black uppercase tracking-wider">${report.statLeftLabel}</h4>
                      <p class="text-[10px] text-black/70 leading-normal">${report.statLeftDesc}</p>
                    </div>
                  </div>

                  <!-- Sub donut metric right -->
                  <div class="flex items-center gap-3">
                    <div class="relative w-12 h-12 flex-shrink-0 flex items-center justify-center">
                      <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path class="text-black/10" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path class="text-[#c62828]" stroke-dasharray="${report.statRightVal}, 100" stroke-width="3" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <span class="absolute text-xs font-display font-black text-[#c62828]">${report.statRightVal}%</span>
                    </div>
                    <div>
                      <h4 class="text-[10px] font-black uppercase tracking-wider">${report.statRightLabel}</h4>
                      <p class="text-[10px] text-black/70 leading-normal">${report.statRightDesc}</p>
                    </div>
                  </div>

                  <!-- Split bar balancing -->
                  <div class="space-y-1.5 flex flex-col justify-center">
                    <span class="text-[10px] font-black uppercase tracking-wider">${report.splitBarHeader}</span>
                    <div class="w-full h-3.5 bg-black/10 rounded overflow-hidden flex text-[9px] font-bold text-center text-white">
                      <div style="width: ${report.splitBarLeftVal}%" class="bg-black/90 flex items-center justify-center">
                        ${report.splitBarLeftVal}%
                      </div>
                      <div style="width: ${report.splitBarRightVal}%" class="bg-[#c2aa91] flex items-center justify-center">
                        ${report.splitBarRightVal}%
                      </div>
                    </div>
                    <div class="flex justify-between text-[8px] font-black uppercase tracking-wide text-black/50">
                      <span>${report.splitBarLeftLabel}</span>
                      <span>${report.splitBarRightLabel}</span>
                    </div>
                  </div>
                </div>

                <!-- Lower metrics segment with categories and grid -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  <!-- Dynamic Categories Evaluation -->
                  <div class="md:col-span-2 space-y-3.5">
                    <h3 class="font-display font-black text-xs tracking-widest uppercase text-black border-b border-black pb-1.5">
                      Segment Performance Benchmarks
                    </h3>
                    <div class="space-y-2.5">
                      ${report.categoryScores.map(cat => `
                        <div class="flex gap-4 items-start">
                          <div class="w-12 bg-black text-[#f5f0eb] py-0.5 rounded text-center text-[10px] font-black flex-shrink-0">
                            ${cat.score}%
                          </div>
                          <div class="flex-1">
                            <h5 class="text-[11px] font-bold uppercase leading-none">${cat.label}</h5>
                            <p class="text-[10px] text-black/70 mt-1 leading-normal">${cat.text}</p>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  </div>

                  <!-- 10x10 Small Red Dot visual matrix (Ref. image highlight!) -->
                  <div class="bg-[#e0d6cb] p-4 rounded flex flex-col justify-between border border-black/5">
                    <div>
                      <h4 class="text-[11px] font-black uppercase tracking-wider">${report.gridHighlightLabel}</h4>
                      <p class="text-[10px] text-black/75 mt-1 leading-normal mb-3">${report.gridHighlightDesc}</p>
                    </div>

                    <!-- Dot Matrix grid generator (10x10 = 100 units) -->
                    <div class="grid grid-cols-10 gap-1.5 w-full max-w-[140px] mx-auto">
                      ${Array.from({ length: 100 }).map((_, i) => {
                        // Highlight first index scores matching percentage parameter
                        const isHighlighted = i < report.gridHighlightVal;
                        return `<div class="w-2 h-2 rounded-sm ${isHighlighted ? 'bg-[#c62828]' : 'bg-black/10'}"></div>`;
                      }).join('')}
                    </div>

                    <div class="mt-3 text-center">
                      <span class="text-[14px] font-display font-extrabold text-black block">${report.gridHighlightVal}% Utilisation Density</span>
                    </div>
                  </div>
                </div>

                <!-- Strategic recommendations list -->
                <div class="bg-black text-[#f5f0eb] p-6 rounded relative overflow-hidden">
                  <h3 class="font-display font-black text-xs tracking-widest uppercase text-amber-200 mb-3 border-b border-white/20 pb-1.5">
                    Strategic AI Recommendations
                  </h3>
                  <ul class="space-y-1.5 text-[11px] list-disc list-inside text-white/95">
                    ${report.recommendations.map(rec => `
                      <li class="leading-relaxed font-medium">${rec}</li>
                    `).join('')}
                  </ul>
                </div>

              </div>
            </div>
          </div>

          <!-- Page Footer benchmark styling -->
          <footer class="mt-8 border-t border-black pb-2 pt-2 text-[8px] font-mono tracking-wider flex justify-between uppercase text-black/50">
            <span>TRANQUIL HAVEN OPERATIONAL AUDIT - PRIVILEGED STAFF ACCESS</span>
            <span>PAGE 2 OF 16</span>
          </footer>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  // Convert HTML report content into beautiful, pre-formatted Doc format
  const handleExportDOC = () => {
    if (!report) return;

    // Word loves plain clean HTML structure with table schemas
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <title>${report.title}</title>
          <style>
            body { font-family: 'Arial', sans-serif; color: #1a1a1a; padding: 20px; background-color: #fcf9f5; }
            h1 { font-family: 'Georgia', serif; font-size: 26pt; color: #000000; border-bottom: 2px solid #000000; padding-bottom: 5px; }
            h2 { font-family: 'Arial', sans-serif; font-size: 16pt; color: #111111; margin-top: 25px; border-bottom: 1px solid #cccccc; }
            p { font-size: 10.5pt; line-height: 1.5; color: #333333; }
            .meta { font-size: 9pt; font-family: 'Courier New', monospace; color: #666666; margin-bottom: 20px; }
            .stat-box { background-color: #f1ebd9; border: 1px solid #cccccc; padding: 15px; margin: 15px 0; border-radius: 4px; }
            .score { font-weight: bold; font-size: 14pt; color: #c62828; }
            li { font-size: 10pt; line-height: 1.4; margin-bottom: 6px; }
          </style>
        </head>
        <body>
          <h1>${report.title}</h1>
          <p class="meta">Subtitle: ${report.subtitle}<br>Generated At: ${report.generatedAt}</p>
          
          <h2>1. Executive Summary & Audit</h2>
          <p>${report.executiveSummary.replace(/\n/g, '<br><br>')}</p>
          
          <div class="stat-box">
            <span class="score">${report.performanceDonutLabel}: ${report.performanceDonutValue}%</span>
            <p>${report.performanceDonutComment}</p>
          </div>

          <h2>2. Functional KPIs Breakdown</h2>
          <ul>
            <li><strong>${report.statLeftLabel}:</strong> ${report.statLeftVal}% - ${report.statLeftDesc}</li>
            <li><strong>${report.statRightLabel}:</strong> ${report.statRightVal}% - ${report.statRightDesc}</li>
            <li><strong>${report.splitBarHeader}:</strong> ${report.splitBarLeftVal}% ${report.splitBarLeftLabel} vs ${report.splitBarRightVal}% ${report.splitBarRightLabel}</li>
          </ul>

          <h2>3. Segment Performance Evaluations</h2>
          <table border="1" cellpadding="8" style="border-collapse:collapse; width: 100%; border-color: #dddddd;">
            <tr style="background-color: #eee;">
              <th>Segment Indicator</th>
              <th>Evaluation Score</th>
              <th>Detailed Analysis Copy</th>
            </tr>
            ${report.categoryScores.map(cat => `
              <tr>
                <td><strong>${cat.label}</strong></td>
                <td align="center"><span style="color:#c62828; font-weight:bold;">${cat.score}%</span></td>
                <td>${cat.text}</td>
              </tr>
            `).join('')}
          </table>

          <h2>4. Strategic Recommendations Actions Matrix</h2>
          <ol>
            ${report.recommendations.map(rec => `
              <li>${rec}</li>
            `).join('')}
          </ol>

          <hr>
          <p style="font-size: 8pt; text-align: center; color: #999999;">TRANQUIL HAVEN OPERATIONS - ALL INTEL RIGHTS RESERVED</p>
        </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], {
      type: 'application/msword'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Tranquil_Haven_Operations_Report_${Date.now().toString().slice(-4)}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Title & Introduction banner */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
        <div>
          <h2 className="font-display text-2xl font-black text-primary">AI Report Hub</h2>
          <p className="text-on-surface-variant font-sans text-xs mt-0.5">
            Deploy server-side Tranquil 3.5 Operational Agents to write meticulously formatted reports and action plans
          </p>
        </div>
      </section>

      {/* Main split work board */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Setup brief inputs */}
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-surface-container-lowest border border-[#f4f1ee] rounded-lg p-5 card-shadow space-y-4">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#f4f1ee]">
              <span className="material-symbols-outlined text-[#c2aa91]">smart_toy</span>
              <h3 className="font-display font-extrabold text-base text-primary">Report Configuration</h3>
            </div>

            {/* Select options */}
            <div className="space-y-3.5">
              <label className="block text-xs font-bold text-[#5f5e5c] uppercase tracking-wider">
                Select Operational Focus
              </label>
              
              <div className="space-y-2">
                {focusOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSelectedFocus(opt.id);
                      if (opt.id !== 'Custom Analysis') setCustomBrief('');
                    }}
                    className={`w-full text-left p-3 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                      selectedFocus === opt.id 
                        ? 'bg-primary text-on-primary border-primary shadow-sm'
                        : 'bg-surface-container-low border-[#eae8e4] text-[#1a1a1a] hover:bg-surface-container'
                    }`}
                  >
                    <p className="font-bold uppercase tracking-wide text-[10px] mb-0.5">{opt.label}</p>
                    {opt.desc && (
                      <p className={`text-[10px] ${selectedFocus === opt.id ? 'opacity-85' : 'text-[#5f5e5c]'}`}>
                        {opt.desc}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom brief text */}
            {selectedFocus === 'Custom Analysis' && (
              <div className="space-y-2 animate-fade-in">
                <label className="block text-xs font-bold text-[#5f5e5c] uppercase tracking-wider">
                  Operational Guidelines & Directives
                </label>
                <textarea
                  value={customBrief}
                  onChange={(e) => setCustomBrief(e.target.value)}
                  placeholder="E.g., Evaluate the impact of standard double rooms turnaround speed during shift handovers specifically, and suggest steps to minimize repair latency."
                  rows={4}
                  className="w-full bg-surface-container-low border border-[#eae8e4] rounded-lg p-3 text-xs font-semibold focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            {/* Live Data Summary indicators */}
            <div className="bg-[#fcf9f5] border border-[#f4f1ee] p-3 rounded-md space-y-2 text-[10px] font-sans font-medium text-on-secondary-container">
              <span className="font-bold text-primary text-[11px] block mb-1">Attached Live Context:</span>
              <div className="flex justify-between">
                <span>Rooms Matrix:</span>
                <span className="font-bold">{rooms.length} units ({rooms.filter(r => r.status === 'Occupied').length} occupied)</span>
              </div>
              <div className="flex justify-between">
                <span>Reservations Schedule:</span>
                <span className="font-bold">{reservations.length} active expected</span>
              </div>
              <div className="flex justify-between">
                <span>Maintenance Backlog:</span>
                <span className="font-bold text-[#c62828]">{tickets.filter(t => t.status === 'ACTIVE').length} unresolved tickets</span>
              </div>
            </div>

            {/* Submit generation */}
            <button
              onClick={handleGenerateReport}
              disabled={isLoading}
              className="w-full bg-primary text-on-primary py-3 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-black/90 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer border-none shadow-sm flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                  Auditing Operations...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                  Mobilize Ops Agent
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Render Result matching reference image */}
        <div className="lg:col-span-2 space-y-4">
          
          <AnimatePresence mode="wait">
            {/* Loading state rendering dynamic analytical logs */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-surface-container-lowest border border-[#f4f1ee] rounded-lg p-12 card-shadow flex flex-col items-center justify-center text-center space-y-6 h-[500px]"
              >
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-[#eae8e4] rounded-full border-t-primary animate-spin" />
                  <span className="material-symbols-outlined text-primary scale-125 absolute">smart_toy</span>
                </div>
                
                <div className="space-y-2 max-w-sm">
                  <h4 className="font-display font-extrabold text-base text-primary uppercase tracking-wide">
                    Agent Log Analysis In Progress
                  </h4>
                  <p className="text-[#5f5e5c] text-xs font-semibold leading-relaxed font-sans">
                    {loadingStep}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Blank Placeholder state */}
            {!isLoading && !report && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-surface-container-lowest border border-[#f4f1ee] rounded-lg p-12 card-shadow flex flex-col items-center justify-center text-center space-y-4 h-[500px]"
              >
                <div className="w-16 h-16 bg-[#fbf9f7] rounded-full border border-[#f4f1ee] flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[32px]">analytics</span>
                </div>
                <div className="max-w-xs space-y-1">
                  <h4 className="font-display font-medium text-base text-[#1a1a1a]">Report Sandbox Idle</h4>
                  <p className="text-on-surface-variant text-xs leading-relaxed font-sans">
                    Configure your operational directives or select a pre-calibrated focus, then trigger the AI Agent above to compose a detailed audit.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Beautiful styled report rendered to match Benchmark image! */}
            {!isLoading && report && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                {/* Visual Download Header ribbon bar */}
                <div className="bg-[#1e1e1e] p-3 rounded-lg flex justify-between items-center text-white shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded font-black font-mono tracking-widest">
                      SYSTEM READY
                    </span>
                    <span className="text-xs font-bold text-white/85 font-sans hidden md:inline">
                      Report rendered following Swiss-editorial specifications
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* DOC download */}
                    <button
                      onClick={handleExportDOC}
                      className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer border-none"
                    >
                      <span className="material-symbols-outlined text-[16px]">file_download</span>
                      Download DOC
                    </button>
                    {/* PDF download */}
                    <button
                      onClick={handlePrintPDF}
                      className="bg-[#c2aa91] hover:bg-[#b09880] text-[#1a1a1a] px-4 py-2 rounded text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer border-none"
                    >
                      <span className="material-symbols-outlined text-[16px]">print</span>
                      Export PDF
                    </button>
                  </div>
                </div>

                {/* Swiss design editorial report block */}
                <div className="bg-[#f5f0eb] border border-black/10 rounded-sm p-6 md:p-8 flex flex-col md:flex-row gap-6 text-[#1e1e1e] shadow-lg relative overflow-hidden">
                  
                  {/* Vertical left black surveyor banner */}
                  <div className="w-full md:w-12 bg-black text-[#f5f0eb] py-4 md:py-8 flex md:flex-col items-center justify-between uppercase tracking-[0.4em] text-[8px] font-display rounded-sm select-none">
                    <span className="font-black md:vertical-text">TRANQUIL HAVEN</span>
                    <span className="text-[#c2aa91] font-extrabold mt-0 md:mt-8 md:vertical-text">OPERATIONS AUDIT</span>
                  </div>

                  {/* Main Editorial body */}
                  <div className="flex-1 space-y-6">
                    
                    {/* High rule header ribbon */}
                    <div className="border-b border-black/85 pb-4">
                      <span className="text-[8px] font-black tracking-[0.3em] uppercase text-black/60 block">
                        BUILDING THE BRIDGE BETWEEN COMFORT AND REAL-TIME LOGISTICS
                      </span>
                      <h3 className="font-display font-black text-2xl md:text-3xl text-black leading-tight mt-1.5">
                        {report.title}
                      </h3>
                      <h4 className="text-[10px] font-bold tracking-wider text-black/85 mt-1 uppercase">
                        {report.subtitle}
                      </h4>
                      <p className="text-[9px] font-mono text-black/40 mt-1">
                        System stamp signature: {report.generatedAt}
                      </p>
                    </div>

                    {/* Executive summaries columns */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="md:col-span-2 space-y-3.5 pr-0 md:pr-4 border-r-0 md:border-r border-black/10">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#534b42] block">
                          Operational Executive Narrative
                        </span>
                        <p className="text-xs leading-relaxed text-black/80 font-medium font-sans whitespace-pre-line text-justify">
                          {report.executiveSummary}
                        </p>
                      </div>

                      {/* Right Panel: Circle percentage block (Matching image 58% Donut) */}
                      <div className="bg-black/5 p-4 rounded border border-black/5 flex flex-col justify-between space-y-5">
                        <div className="text-center space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-black/60 font-display">
                            {report.performanceDonutLabel}
                          </span>
                          
                          {/* Circle Percent SVG */}
                          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <circle cx="18" cy="18" r="16" fill="transparent" stroke="rgba(0,0,0,0.06)" strokeWidth="3" />
                              <circle cx="18" cy="18" r="16" fill="transparent" stroke="currentColor" strokeWidth="3.5" strokeDasharray={`${report.performanceDonutValue} 100`} strokeLinecap="round" className="text-black" />
                            </svg>
                            <span className="absolute text-2xl font-display font-black text-black">
                              {report.performanceDonutValue}%
                            </span>
                          </div>
                        </div>

                        <p className="text-[10px] leading-relaxed text-black/80 text-center italic font-sans">
                          {report.performanceDonutComment}
                        </p>
                      </div>
                    </div>

                    {/* Mid metrics: Sub donut graphs + split balance bar */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-b border-black py-4">
                      
                      {/* Sub Donut 1 */}
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="16" fill="transparent" stroke="rgba(0,0,0,0.06)" strokeWidth="2.5" />
                            <circle cx="18" cy="18" r="16" fill="transparent" stroke="currentColor" strokeWidth="3" strokeDasharray={`${report.statLeftVal} 100`} strokeLinecap="round" className="text-black" />
                          </svg>
                          <span className="absolute text-[10px] font-display font-black text-black">{report.statLeftVal}%</span>
                        </div>
                        <div>
                          <h5 className="text-[9px] font-black uppercase tracking-wider">{report.statLeftLabel}</h5>
                          <p className="text-[9px] text-black/70 leading-normal font-sans">{report.statLeftDesc}</p>
                        </div>
                      </div>

                      {/* Sub Donut 2 */}
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="16" fill="transparent" stroke="rgba(0,0,0,0.06)" strokeWidth="2.5" />
                            <circle cx="18" cy="18" r="16" fill="transparent" stroke="currentColor" strokeWidth="3" strokeDasharray={`${report.statRightVal} 100`} strokeLinecap="round" className="text-[#c62828]" />
                          </svg>
                          <span className="absolute text-[10px] font-display font-black text-[#c62828]">{report.statRightVal}%</span>
                        </div>
                        <div>
                          <h5 className="text-[9px] font-black uppercase tracking-wider text-[#c62828]">{report.statRightLabel}</h5>
                          <p className="text-[9px] text-black/70 leading-normal font-sans">{report.statRightDesc}</p>
                        </div>
                      </div>

                      {/* Bar balancing bar chart comparison */}
                      <div className="space-y-1.5 flex flex-col justify-center">
                        <span className="text-[9px] font-black uppercase tracking-wider text-black/70 block">
                          {report.splitBarHeader}
                        </span>
                        
                        <div className="w-full h-3.5 bg-black/10 rounded overflow-hidden flex text-[9px] font-bold text-center text-white font-sans select-none">
                          <div style={{ width: `${report.splitBarLeftVal}%` }} className="bg-black/95 flex items-center justify-center">
                            {report.splitBarLeftVal}%
                          </div>
                          <div style={{ width: `${report.splitBarRightVal}%` }} className="bg-[#a89078] flex items-center justify-center">
                            {report.splitBarRightVal}%
                          </div>
                        </div>

                        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-black/50 font-sans">
                          <span>{report.splitBarLeftLabel}</span>
                          <span>{report.splitBarRightLabel}</span>
                        </div>
                      </div>

                    </div>

                    {/* Category List & Grid Module (Red square dots visual) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      
                      {/* Benchmarks Category Scores */}
                      <div className="md:col-span-2 space-y-3">
                        <h4 className="font-display font-black text-xs tracking-widest uppercase text-black border-b border-black pb-1.5">
                          Operational Service Ratings
                        </h4>
                        
                        <div className="space-y-2.5">
                          {report.categoryScores.map((cat, index) => (
                            <div key={index} className="flex gap-4 items-start">
                              <span className="w-10 bg-black text-[#f5f0eb] py-0.5 rounded text-center text-[10px] font-black block font-display">
                                {cat.score}%
                              </span>
                              <div className="space-y-0.5">
                                <h5 className="text-[10px] font-bold uppercase text-black leading-tight">{cat.label}</h5>
                                <p className="text-[9.5px] text-black/70 font-sans leading-relaxed">{cat.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 10x10 Small Red Dot visual matrix (REVOLUTIONS BRIGHT HIGHLIGHT!) */}
                      <div className="bg-[#e4d9ce] p-3.5 rounded flex flex-col justify-between border border-black/5 min-h-[200px]">
                        <div className="space-y-1">
                          <h5 className="text-[10px] font-black uppercase tracking-wider text-black/85">{report.gridHighlightLabel}</h5>
                          <p className="text-[9px] text-black/75 font-sans leading-normal leading-relaxed">{report.gridHighlightDesc}</p>
                        </div>

                        {/* Dot Matrix grid generator (10x10 = 100 units) */}
                        <div className="grid grid-cols-10 gap-1 my-2 max-w-[130px] mx-auto">
                          {Array.from({ length: 100 }).map((_, i) => {
                            const isHighlighted = i < report.gridHighlightVal;
                            return (
                              <div 
                                key={i} 
                                className={`w-1.5 h-1.5 rounded-[1px] transition-all duration-300 ${isHighlighted ? 'bg-[#c62828]' : 'bg-black/10'}`} 
                              />
                            );
                          })}
                        </div>

                        <div className="text-center">
                          <span className="text-[12px] font-display font-black text-black select-none">{report.gridHighlightVal}% Asset Utilization</span>
                        </div>
                      </div>

                    </div>

                    {/* Bottom Recommendations rounded capsule black sheet */}
                    <div className="bg-[#111] text-[#f5f0eb] p-5 rounded-lg relative overflow-hidden">
                      <div className="relative z-10 space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#c2aa91] block">
                          RECOMMENDED OPERATIONS OUTLINE - FOR GM ALEX MERCER
                        </span>
                        
                        <ul className="space-y-1.5 text-[10.5px] font-sans font-medium text-white/90 list-disc list-inside">
                          {report.recommendations.map((rec, index) => (
                            <li key={index} className="leading-relaxed text-justify">
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />
                    </div>

                    {/* Vintage benchmark style page marks */}
                    <div className="flex justify-between items-center text-[8px] font-mono tracking-wider uppercase text-black/40 border-t border-black/10 pt-3">
                      <span>SECURE LOGISTICS TERMINAL UNIT AX3</span>
                      <span>PAGE 2 OF 16</span>
                    </div>

                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </section>

    </div>
  );
}
