import React, { useState, useEffect } from "react";
import { 
  Building, Coins, Sparkles, MessageSquare, Smartphone, Mail, FileText,
  Clock, HelpCircle, Plus, RefreshCw, TrendingUp, MapPin, Check,
  Trash2, RotateCcw, CheckCircle, Copy, Download, ExternalLink, Info, Pencil, Save
} from "lucide-react";

type ChannelType = "WhatsApp" | "SMS" | "Email" | "Official Letter";
type ToneType = "Professional" | "Polite" | "Urgent" | "Friendly" | "Direct";
type LanguageType = "English" | "Luganda" | "Swahili";

interface VendorPreset {
  name: string;
  category: string;
  location: string;
  defaultTotalAmount: number;
  defaultAmount: number;
  defaultBalance: number;
  purpose: string;
}

interface GeneratedMessage {
  id: string;
  orgName: string;
  vendorName: string;
  totalAmount?: string;
  amount: string;
  balance?: string;
  purpose: string;
  paymentDate?: string;
  channel: ChannelType;
  tone: ToneType;
  language: LanguageType;
  subject?: string;
  body: string;
  summary: string;
  tips?: string[];
  referenceId: string;
  timestamp: string;
}

const JINJA_NURSING_PRESETS: VendorPreset[] = [
  { name: "Jinja School of Nursing and Midwifery", category: "Nursing School", location: "Jinja, Uganda", defaultTotalAmount: 3700000, defaultAmount: 2500000, defaultBalance: 1200000, purpose: "State Examination Fees & Capitation Grants" },
  { name: "Nile Institute of Nursing and Midwifery", category: "Nursing School", location: "Jinja, Mpumudde", defaultTotalAmount: 1800000, defaultAmount: 1800000, defaultBalance: 0, purpose: "Practical Assessment Materials Contribution" },
  { name: "St. Elizabeth School of Nursing & Midwifery", category: "Nursing School", location: "Jinja, Kakira", defaultTotalAmount: 1600000, defaultAmount: 1250000, defaultBalance: 350000, purpose: "Clinical Supervision Logbook Fees" },
  { name: "Victoria College of Health Sciences", category: "Health College", location: "Jinja Town", defaultTotalAmount: 4700000, defaultAmount: 3200000, defaultBalance: 1500000, purpose: "Nursing Council Registration & Accreditation" },
  { name: "Eastern Region Inspectorate of Nursing", category: "Regulatory Board", location: "Jinja Municipality", defaultTotalAmount: 450000, defaultAmount: 450000, defaultBalance: 0, purpose: "Annual Operational Permit & License Verification" },
  { name: "Busoga Printers & Stationers Ltd", category: "Stationery Supplier", location: "Jinja, Main Street", defaultTotalAmount: 1900000, defaultAmount: 950000, defaultBalance: 950000, purpose: "Printing of Mid-Year Nursing Exams" },
  { name: "Jinja General Hospital Supplies", category: "Medical Vendor", location: "Jinja Hospital Road", defaultTotalAmount: 7500000, defaultAmount: 5400000, defaultBalance: 2100000, purpose: "Supply of Clinical Training Kits and Sutures" },
  { name: "Source of the Nile Catering & Events", category: "Service Vendor", location: "Jinja, Nile Crescent", defaultTotalAmount: 1500000, defaultAmount: 1500000, defaultBalance: 0, purpose: "Catering for Annual District Nursing Seminar" },
];

const SUGGESTED_ORG_NAMES = [
  "Ministry of Health, Uganda (MoH)",
  "Uganda Nurses and Midwives Council (UNMC)",
  "Jinja District Local Government",
  "Association of Uganda Nursing Schools (AUNS)",
  "Uganda Allied Health Examinations Board (UAHEB)",
];

function HistoryLog({ history, onSelect, onDelete, onClearAll }: {
  history: GeneratedMessage[];
  onSelect: (msg: GeneratedMessage) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}) {
  const totalAmountUGX = history.reduce((sum, item) => {
    const rawVal = parseInt(item.amount.replace(/[^0-9]/g, ""), 10) || 0;
    return sum + rawVal;
  }, 0);

  const formattedTotal = new Intl.NumberFormat("en-UG", {
    style: "currency", currency: "UGX", maximumFractionDigits: 0,
  }).format(totalAmountUGX);

  const uniqueVendorsCount = new Set(history.map(item => item.vendorName)).size;

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "WhatsApp": return <MessageSquare className="w-3.5 h-3.5 text-green-600" />;
      case "SMS": return <Smartphone className="w-3.5 h-3.5 text-blue-600" />;
      case "Email": return <Mail className="w-3.5 h-3.5 text-indigo-600" />;
      case "Official Letter": return <FileText className="w-3.5 h-3.5 text-orange-600" />;
      default: return <HelpCircle className="w-3.5 h-3.5 text-gray-600" />;
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6 text-left">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#f3f0ec] shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Total Logged Payments</p>
            <p className="text-base font-semibold text-gray-900 mt-0.5">{formattedTotal}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#f3f0ec] shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Unique Vendors</p>
            <p className="text-base font-semibold text-gray-900 mt-0.5">{uniqueVendorsCount} Schools/Vendors</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#f3f0ec] shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Generated Drafts</p>
            <p className="text-base font-semibold text-gray-900 mt-0.5">{history.length} Notifications</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#f3f0ec] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Payment Notification Log History</h3>
          {history.length > 0 && (
            <button onClick={onClearAll} className="text-xs font-bold text-red-600 hover:text-red-800 transition-colors cursor-pointer">
              Clear Logs
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-sm">No payment confirmations generated yet.</p>
            <p className="text-xs text-gray-500 mt-1">Generated drafts are saved to your local session workspace.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {history.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-xs text-gray-900 truncate">{item.vendorName}</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800">
                      {getChannelIcon(item.channel)} {item.channel}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800">
                      {item.amount} UGX
                    </span>
                    {item.balance && item.balance !== "0" && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-800">
                        Bal: {item.balance} UGX
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-1 truncate">
                    <strong className="text-gray-600 font-normal">Sender:</strong> {item.orgName} |
                    <strong className="text-gray-600 font-normal pl-1">Purpose:</strong> {item.purpose || "Payment Received"}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    ID: {item.referenceId} • Paid on: {item.paymentDate || "N/A"} • Drafted: {new Date(item.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <button onClick={() => onSelect(item)} className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer" title="Reload Message & Preview">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleCopy(item.body)} className="p-1.5 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all cursor-pointer" title="Copy full message">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDelete(item.id)} className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all cursor-pointer" title="Delete record">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PhoneSimulator({ message, isLoading, onUpdateMessage }: {
  message: GeneratedMessage | null;
  isLoading: boolean;
  onUpdateMessage?: (updated: GeneratedMessage) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState("");
  const [editedSubject, setEditedSubject] = useState("");

  useEffect(() => {
    if (message) {
      setEditedBody(message.body);
      setEditedSubject(message.subject || "");
    }
  }, [message?.id, message?.body, message?.subject]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 border border-dashed border-gray-300 rounded-2xl bg-gray-50/50 p-6 text-center">
        <div className="relative flex items-center justify-center w-16 h-16">
          <div className="absolute inset-0 border-4 border-emerald-100 rounded-full animate-ping"></div>
          <div className="relative border-4 border-t-emerald-600 border-r-emerald-600 border-b-emerald-200 border-l-emerald-200 w-12 h-12 rounded-full animate-spin"></div>
        </div>
        <p className="mt-6 text-lg font-medium text-gray-700">Drafting Payment Notification...</p>
        <p className="mt-2 text-sm text-gray-500 max-w-sm">
          Gemini is synthesizing the payment details, validating currency terminology (UGX Shillings), and structuring the notification layout.
        </p>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="flex flex-col items-center justify-center h-96 border border-dashed border-gray-200 rounded-2xl bg-gray-50/40 p-6 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 mb-4">
          <Smartphone className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-medium text-gray-800">Notification Preview Simulator</h3>
        <p className="mt-2 text-sm text-gray-500 max-w-sm">
          Select an organization, pick a vendor, adjust the payment amount, and click "Generate" to preview.
        </p>
      </div>
    );
  }

  const handleCopy = () => {
    const textToCopy = message.subject ? `Subject: ${message.subject}\n\n${message.body}` : message.body;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const textToDownload = `=========================================\nPAYMENT VERIFICATION MESSAGE\nGenerated on: ${new Date(message.timestamp).toLocaleString()}\nOrganization: ${message.orgName}\nVendor: ${message.vendorName}\nAmount: ${message.amount} UGX\nReference ID: ${message.referenceId}\nChannel: ${message.channel}\nTone: ${message.tone}\nLanguage: ${message.language}\n=========================================\n${message.subject ? `Subject: ${message.subject}\n\n` : ""}\n${message.body}`;
    const blob = new Blob([textToDownload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payment_verification_${message.referenceId.replace(/\//g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatTextWithMarkdown = (text: string) => {
    return text.split("\n").map((line, index) => {
      let formattedLine = line;
      const boldRegex = /\*([^*]+)\*/g;
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;
      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-semibold text-gray-900">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }
      return <span key={index} className="block min-h-[1rem]">{parts.length > 0 ? parts : line}</span>;
    });
  };

  const handleSave = () => {
    if (onUpdateMessage) {
      onUpdateMessage({ ...message, body: editedBody, subject: message.subject !== undefined ? editedSubject : undefined });
    }
    setIsEditing(false);
  };

  const getWhatsAppLink = () => {
    const text = encodeURIComponent(message.body);
    return `https://wa.me/?text=${text}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#f3f0ec] shadow-sm">
        <div className="text-left">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800">
            Ref: {message.referenceId}
          </span>
          <h4 className="text-sm text-gray-500 mt-1">Simulated Layout for: <strong className="text-gray-700 font-medium">{message.channel}</strong></h4>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer border border-gray-200">Cancel</button>
              <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-sm"><Save className="w-3.5 h-3.5" />Save</button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors cursor-pointer" title="Edit this generated draft"><Pencil className="w-3.5 h-3.5 text-gray-500" />Edit</button>
              <button onClick={handleCopy} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors cursor-pointer" title="Copy to clipboard">{copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}{copied ? "Copied" : "Copy"}</button>
              <button onClick={handleDownload} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors cursor-pointer" title="Download as TXT file"><Download className="w-3.5 h-3.5 text-gray-500" />Download</button>
            </>
          )}
        </div>
      </div>

      <div className="relative mx-auto max-w-md bg-gray-100 p-3 rounded-3xl border-8 border-gray-800 shadow-lg min-h-[480px] overflow-hidden flex flex-col">
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-5 bg-gray-800 rounded-b-xl z-20 flex items-center justify-center">
          <div className="w-2.5 h-2.5 bg-gray-900 rounded-full mr-2"></div>
          <div className="w-12 h-1 bg-gray-700 rounded-full"></div>
        </div>

        <div className="flex-1 rounded-2xl overflow-hidden bg-white flex flex-col pt-4">
          {isEditing ? (
            <div className="flex-1 flex flex-col bg-gray-50 p-4 justify-between overflow-y-auto">
              <div className="space-y-4 flex-1">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2 text-left">
                  <h5 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Edit Draft Message</h5>
                  <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">{message.channel}</span>
                </div>
                {message.subject !== undefined && (
                  <div className="space-y-1 text-left">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Subject</label>
                    <input type="text" value={editedSubject} onChange={(e) => setEditedSubject(e.target.value)} className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden font-medium bg-white" />
                  </div>
                )}
                <div className="space-y-1 text-left flex flex-col flex-1 min-h-[220px]">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Message Body</label>
                  <textarea value={editedBody} onChange={(e) => setEditedBody(e.target.value)} className="w-full flex-1 rounded-lg border border-gray-200 px-2.5 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden resize-none leading-relaxed bg-white" rows={12} />
                  {message.channel === "SMS" && <div className="text-[9px] text-right text-gray-500 mt-1 font-mono">{editedBody.length} chars (approx. {Math.ceil(editedBody.length / 160)} SMS)</div>}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-gray-200 mt-3">
                <button onClick={() => setIsEditing(false)} className="flex-1 py-2 text-[11px] font-bold text-gray-500 hover:text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer text-center">Cancel</button>
                <button onClick={handleSave} className="flex-1 py-2 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer text-center">Save Draft</button>
              </div>
            </div>
          ) : (
            <>
              {message.channel === "WhatsApp" && (
                <div className="flex-1 flex flex-col bg-[#efeae2]">
                  <div className="bg-[#075e54] text-white px-3 py-2 flex items-center gap-2 text-xs">
                    <div className="w-7 h-7 bg-emerald-800 rounded-full flex items-center justify-center font-bold text-white text-xs">{message.orgName.substring(0, 2).toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate flex items-center gap-1 text-white">{message.orgName}<span className="inline-block w-3 h-3 bg-blue-500 rounded-full text-[7px] text-white flex items-center justify-center font-bold" title="Verified Org">✓</span></div>
                      <div className="text-[10px] text-emerald-200 truncate">Online • Official Business Account</div>
                    </div>
                  </div>
                  <div className="flex-1 p-3 space-y-3 overflow-y-auto flex flex-col justify-end text-xs">
                    <div className="self-center bg-yellow-100 text-yellow-900/80 px-2 py-0.5 rounded-md text-[10px] shadow-xs text-center max-w-[85%]">🔒 Messages are end-to-end encrypted.</div>
                    <div className="self-start bg-white text-gray-800 p-3 rounded-lg rounded-tl-none shadow-xs max-w-[90%] relative">
                      <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-left break-words">{formatTextWithMarkdown(message.body)}</div>
                      <div className="text-[9px] text-gray-400 text-right mt-1.5 flex items-center justify-end gap-0.5">
                        <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-blue-500">✓✓</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-100 p-2 border-t border-gray-200 flex items-center gap-1 text-xs">
                    <div className="bg-white flex-1 rounded-full px-3 py-1.5 text-gray-400 border border-gray-200 text-left truncate">Message...</div>
                    <div className="w-8 h-8 bg-[#075e54] rounded-full flex items-center justify-center text-white"><MessageSquare className="w-4 h-4" /></div>
                  </div>
                </div>
              )}

              {message.channel === "SMS" && (
                <div className="flex-1 flex flex-col bg-gray-50">
                  <div className="border-b border-gray-200 bg-white px-3 py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold">💬</div>
                      <div><div className="font-semibold text-gray-800">{message.orgName}</div><div className="text-[10px] text-gray-400">Short Code: 6040</div></div>
                    </div>
                  </div>
                  <div className="flex-1 p-3 flex flex-col justify-end space-y-3 text-xs">
                    <div className="text-center text-[10px] text-gray-400">Today, {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="self-start bg-gray-200 text-gray-800 p-3 rounded-2xl rounded-bl-none max-w-[85%] leading-relaxed text-left break-words">{message.body}</div>
                    <div className="text-[9px] text-gray-400 self-start ml-1">Delivered</div>
                  </div>
                  <div className="bg-white p-2 border-t border-gray-200 flex items-center gap-2">
                    <div className="bg-gray-100 flex-1 rounded-full px-3 py-1 text-xs text-gray-400 text-left">iMessage / Text Message</div>
                  </div>
                </div>
              )}

              {message.channel === "Email" && (
                <div className="flex-1 flex flex-col bg-gray-100 overflow-y-auto">
                  <div className="bg-emerald-800 text-white px-3 py-2 text-xs flex items-center justify-between"><span className="font-medium">Uganda Financial Mail</span><Mail className="w-3.5 h-3.5" /></div>
                  <div className="bg-white p-3 border-b border-gray-200 text-xs text-left space-y-1">
                    <div><span className="text-gray-400">From: </span><span className="font-medium text-gray-800">payments@{(message.orgName || "org").toLowerCase().replace(/[^a-z]/g, "")}.go.ug</span></div>
                    <div><span className="text-gray-400">To: </span><span className="font-medium text-gray-800">finance@{(message.vendorName || "vendor").toLowerCase().replace(/[^a-z]/g, "")}.edu</span></div>
                    <div className="pt-1.5 font-bold text-gray-900 border-t border-gray-100 mt-1">Subject: {message.subject || "Receipt and Payment Notification Confirmation"}</div>
                  </div>
                  <div className="flex-1 bg-white p-4 text-[11px] leading-relaxed text-gray-800 text-left overflow-y-auto">
                    <div className="border-l-4 border-emerald-600 pl-3 py-1 bg-emerald-50/50 mb-3 rounded-r">
                      <p className="font-medium text-[10px] text-emerald-800">Official Payment Verification Summary</p>
                      <p className="text-gray-700 font-medium">Ref: {message.referenceId} | Amount: {message.amount} Shillings</p>
                    </div>
                    <div className="whitespace-pre-wrap text-gray-700">{formatTextWithMarkdown(message.body)}</div>
                  </div>
                </div>
              )}

              {message.channel === "Official Letter" && (
                <div className="flex-1 flex flex-col bg-white overflow-y-auto border-t-4 border-emerald-700">
                  <div className="p-3 text-center border-b border-gray-200">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-200"><span className="text-emerald-700 font-bold text-xs">🇺🇬</span></div>
                    </div>
                    <h2 className="text-[11px] font-bold text-gray-900 uppercase tracking-wide">{message.orgName}</h2>
                    <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">THE REPUBLIC OF UGANDA • MINISTRY OF FINANCE</p>
                    <div className="flex items-center justify-between text-[8px] text-gray-400 mt-2"><span>Tel: +256 414 707000</span><span>Jinja Regional Block, Nile Ave</span></div>
                  </div>
                  <div className="p-4 flex-1 text-left text-[10px] text-gray-800 space-y-3 leading-relaxed">
                    <div className="flex justify-between text-gray-500 text-[8px]"><span>Ref No: {message.referenceId}</span><span>Date: {new Date(message.timestamp).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span></div>
                    <div className="font-bold text-gray-900 border-b border-gray-100 pb-1.5 uppercase text-[9px] tracking-wide mt-2">RE: {message.subject || "PAYMENT VERIFICATION OF FUNDS RECEIVED"}</div>
                    <div className="whitespace-pre-wrap text-gray-700">{formatTextWithMarkdown(message.body)}</div>
                    <div className="pt-4 mt-4 border-t border-dashed border-gray-100 flex items-center justify-between">
                      <div><div className="w-16 h-1 bg-gray-300 mb-1"></div><p className="text-[7px] text-gray-500 font-bold">COMMISSIONER, FINANCE</p><p className="text-[6px] text-gray-400">JINJA HEADQUARTERS</p></div>
                      <div className="relative w-16 h-16 rounded-full border border-emerald-600/30 p-1 flex items-center justify-center bg-white shadow-sm rotate-12 shrink-0">
                        <div className="w-full h-full rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 text-[10px] font-bold">TH</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {message.tips && message.tips.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
          <h4 className="text-sm font-semibold text-emerald-900 flex items-center gap-1.5 mb-2"><Info className="w-4 h-4 text-emerald-600" /> Uganda Dispatch Tips</h4>
          <ul className="space-y-1.5 text-xs text-emerald-800 text-left list-disc list-inside">
            {message.tips.map((tip, index) => <li key={index}>{tip}</li>)}
          </ul>
        </div>
      )}

      {message.channel === "WhatsApp" && (
        <a href={getWhatsAppLink()} target="_blank" referrerPolicy="no-referrer" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white font-medium text-sm rounded-xl shadow-sm transition-colors cursor-pointer text-center">
          <ExternalLink className="w-4 h-4" /> Send directly via WhatsApp
        </a>
      )}
    </div>
  );
}

export default function AiMessageGenerator() {
  const [orgName, setOrgName] = useState("Uganda Nurses and Midwives Council (UNMC)");
  const [vendorName, setVendorName] = useState("");
  const [totalAmount, setTotalAmount] = useState("3,700,000");
  const [amount, setAmount] = useState("2,500,000");
  const [balance, setBalance] = useState("1,200,000");
  const [purpose, setPurpose] = useState("State Examination Fees & Capitation Grants");
  const [paymentDate, setPaymentDate] = useState(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    return localToday.toISOString().split('T')[0];
  });
  const [channel, setChannel] = useState<ChannelType>("WhatsApp");
  const [tone, setTone] = useState<ToneType>("Professional");
  const [language, setLanguage] = useState<LanguageType>("English");
  const [referenceId, setReferenceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeMessage, setActiveMessage] = useState<GeneratedMessage | null>(null);
  const [history, setHistory] = useState<GeneratedMessage[]>([]);
  const [showCustomOrg, setShowCustomOrg] = useState(false);

  useEffect(() => {
    generateNewReference();
  }, [orgName]);

  useEffect(() => {
    const stored = localStorage.getItem("payment_msg_history");
    if (stored) {
      try { setHistory(JSON.parse(stored)); } catch (e) { console.error(e); }
    }
  }, []);

  const generateNewReference = () => {
    const shortOrg = orgName.replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase() || "PAY";
    const randNum = Math.floor(100000 + Math.random() * 900000);
    setReferenceId(`${shortOrg}/UGX/REC-${randNum}`);
  };

  const handleSelectPreset = (preset: VendorPreset) => {
    setVendorName(preset.name);
    setTotalAmount(preset.defaultTotalAmount.toLocaleString("en-US"));
    setAmount(preset.defaultAmount.toLocaleString("en-US"));
    setBalance(preset.defaultBalance.toLocaleString("en-US"));
    setPurpose(preset.purpose);
  };

  const handleSelectOrgPreset = (name: string) => {
    setOrgName(name);
    setShowCustomOrg(false);
  };

  const recalculateBalance = (tot: string, amt: string) => {
    const totVal = parseInt(tot.replace(/[^0-9]/g, ""), 10) || 0;
    const amtVal = parseInt(amt.replace(/[^0-9]/g, ""), 10) || 0;
    const balVal = Math.max(0, totVal - amtVal);
    setBalance(balVal.toLocaleString("en-US"));
  };

  const handleTotalAmountChange = (val: string) => {
    const cleanNum = val.replace(/[^0-9]/g, "");
    if (cleanNum === "") { setTotalAmount(""); return; }
    const formatted = parseInt(cleanNum, 10).toLocaleString("en-US");
    setTotalAmount(formatted);
    recalculateBalance(formatted, amount);
  };

  const handleAmountChange = (val: string) => {
    const cleanNum = val.replace(/[^0-9]/g, "");
    if (cleanNum === "") { setAmount(""); return; }
    const formatted = parseInt(cleanNum, 10).toLocaleString("en-US");
    setAmount(formatted);
    recalculateBalance(totalAmount, formatted);
  };

  const handleBalanceChange = (val: string) => {
    const cleanNum = val.replace(/[^0-9]/g, "");
    if (cleanNum === "") { setBalance(""); return; }
    const formatted = parseInt(cleanNum, 10).toLocaleString("en-US");
    setBalance(formatted);
  };

  const addTotalAmount = (addVal: number) => {
    const current = parseInt(totalAmount.replace(/[^0-9]/g, ""), 10) || 0;
    const next = current + addVal;
    const formatted = next.toLocaleString("en-US");
    setTotalAmount(formatted);
    recalculateBalance(formatted, amount);
  };

  const addAmount = (addVal: number) => {
    const current = parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0;
    const next = current + addVal;
    const formatted = next.toLocaleString("en-US");
    setAmount(formatted);
    recalculateBalance(totalAmount, formatted);
  };

  const addBalance = (addVal: number) => {
    const current = parseInt(balance.replace(/[^0-9]/g, ""), 10) || 0;
    const next = current + addVal;
    setBalance(next.toLocaleString("en-US"));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (!orgName.trim()) { setErrorMessage("Please select an organization name."); return; }
    if (!vendorName.trim()) { setErrorMessage("Please select a vendor name."); return; }
    if (!amount.trim()) { setErrorMessage("Please specify the payment amount."); return; }

    setLoading(true);
    try {
      const response = await fetch("/api/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName, vendorName, totalAmount, amount, balance, purpose, paymentDate, channel, tone, language }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate message.");
      }
      const data = await response.json();
      const newMsg: GeneratedMessage = {
        id: Math.random().toString(36).substring(2, 9),
        orgName, vendorName, totalAmount, amount, balance, purpose, paymentDate, channel, tone, language,
        subject: data.subject || "",
        body: data.body,
        summary: data.summary || "Payment confirmation message draft",
        tips: data.tips || [],
        referenceId,
        timestamp: new Date().toISOString(),
      };
      setActiveMessage(newMsg);
      const updatedHistory = [newMsg, ...history];
      setHistory(updatedHistory);
      localStorage.setItem("payment_msg_history", JSON.stringify(updatedHistory));
      generateNewReference();
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "An error occurred connecting to the generation server.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHistoryItem = (msg: GeneratedMessage) => {
    setActiveMessage(msg);
    setOrgName(msg.orgName);
    setVendorName(msg.vendorName);
    setTotalAmount(msg.totalAmount || msg.amount);
    setAmount(msg.amount);
    setBalance(msg.balance || "0");
    setPurpose(msg.purpose);
    if (msg.paymentDate) setPaymentDate(msg.paymentDate);
    setChannel(msg.channel);
    setTone(msg.tone);
    setLanguage(msg.language);
    setReferenceId(msg.referenceId);
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = history.filter((item) => item.id !== id);
    setHistory(updated);
    localStorage.setItem("payment_msg_history", JSON.stringify(updated));
    if (activeMessage?.id === id) setActiveMessage(null);
  };

  const handleClearAllHistory = () => {
    if (window.confirm("Are you sure you want to clear your local payment notification logs?")) {
      setHistory([]);
      localStorage.removeItem("payment_msg_history");
      setActiveMessage(null);
    }
  };

  const handleUpdateMessage = (updated: GeneratedMessage) => {
    setActiveMessage(updated);
    const updatedHistory = history.map((item) => item.id === updated.id ? updated : item);
    setHistory(updatedHistory);
    localStorage.setItem("payment_msg_history", JSON.stringify(updatedHistory));
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden text-left">
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-12 translate-y-12 select-none pointer-events-none">
          <Building className="w-72 h-72" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-2">
          <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider bg-emerald-700 text-emerald-100 uppercase">Financial Verification Tool</span>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">Automated Vendor Payment Notifications</h2>
          <p className="text-sm text-emerald-100 leading-relaxed">Generate, customize, and review professional payment confirmation messages in UGX.</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Side */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#f3f0ec] shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="text-left">
              <h3 className="text-base font-bold text-gray-900">Configure Payment Parameters</h3>
              <p className="text-xs text-gray-500">Fill in details to instantly draft verification text</p>
            </div>
            <button type="button" onClick={generateNewReference} className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition-colors bg-emerald-50/50 hover:bg-emerald-50 px-2.5 py-1 rounded-lg cursor-pointer" title="Regenerate unique transaction reference">
              <RefreshCw className="w-3.5 h-3.5" /> New Ref
            </button>
          </div>

          <form onSubmit={handleGenerate} className="space-y-6">
            {/* Organization Name */}
            <div className="space-y-2 text-left">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">1. Dispatching Organization (Sender)</label>
              {!showCustomOrg ? (
                <div className="space-y-2">
                  <select value={orgName} onChange={(e) => { if (e.target.value === "custom") { setShowCustomOrg(true); setOrgName(""); } else { setOrgName(e.target.value); } }} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-hidden">
                    {SUGGESTED_ORG_NAMES.map((name, idx) => <option key={idx} value={name}>{name}</option>)}
                    <option value="custom">✏️ Enter Custom Organization Name...</option>
                  </select>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SUGGESTED_ORG_NAMES.slice(0, 3).map((name, idx) => {
                      const acronym = name.includes("(") ? name.split("(")[1].replace(")", "") : name.substring(0, 5);
                      const isSelected = orgName === name;
                      return (
                        <button key={idx} type="button" onClick={() => handleSelectOrgPreset(name)} className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-all cursor-pointer ${isSelected ? "bg-emerald-600 text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                          {acronym}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. Jinja District Local Government" className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-hidden" />
                  <button type="button" onClick={() => { setShowCustomOrg(false); setOrgName(SUGGESTED_ORG_NAMES[0]); }} className="text-xs font-semibold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 rounded-xl cursor-pointer">Cancel</button>
                </div>
              )}
            </div>

            {/* Vendor Presets */}
            <div className="space-y-2 text-left bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-emerald-600" />Quick Selection: Vendors</label>
                <span className="text-[10px] text-gray-400 font-medium">Click to auto-fill</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                {JINJA_NURSING_PRESETS.map((preset, index) => {
                  const isSelected = vendorName === preset.name;
                  return (
                    <button key={index} type="button" onClick={() => handleSelectPreset(preset)} className={`p-2 rounded-lg text-left text-xs transition-all flex flex-col justify-between border cursor-pointer ${isSelected ? "border-emerald-500 bg-emerald-50/40 shadow-xs" : "border-gray-200 bg-white hover:border-emerald-300 hover:bg-gray-50"}`}>
                      <div className="flex items-start justify-between gap-1 w-full">
                        <span className="font-semibold text-gray-800 line-clamp-1 truncate">{preset.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[9px] text-gray-400 w-full">
                        <span>{preset.category}</span>
                        <span className="font-medium text-emerald-700">Paid {preset.defaultAmount.toLocaleString()} of {preset.defaultTotalAmount.toLocaleString()} UGX</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vendor Name */}
            <div className="space-y-2 text-left">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">2. Vendor Name</label>
              <input type="text" value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="e.g. Jinja School of Nursing and Midwifery" className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-hidden" required />
            </div>

            {/* Amount Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 text-left">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">3. Total Amount (UGX)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-xs font-bold text-gray-400">UGX</span>
                  <input type="text" value={totalAmount} onChange={(e) => handleTotalAmountChange(e.target.value)} placeholder="e.g. 3,700,000" className="w-full rounded-xl border border-gray-200 pl-12 pr-3.5 py-2.5 text-sm font-semibold text-gray-900 focus:border-emerald-500 focus:outline-hidden" required />
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  <button type="button" onClick={() => addTotalAmount(500000)} className="px-1.5 py-0.5 text-[9px] bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-md transition-colors cursor-pointer">+500k</button>
                  <button type="button" onClick={() => addTotalAmount(1000000)} className="px-1.5 py-0.5 text-[9px] bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-md transition-colors cursor-pointer">+1.0M</button>
                  <button type="button" onClick={() => addTotalAmount(2500000)} className="px-1.5 py-0.5 text-[9px] bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-md transition-colors cursor-pointer">+2.5M</button>
                </div>
              </div>

              <div className="space-y-2 text-left">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">4. Paid Amount (UGX)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-xs font-bold text-gray-400">UGX</span>
                  <input type="text" value={amount} onChange={(e) => handleAmountChange(e.target.value)} placeholder="e.g. 2,500,000" className="w-full rounded-xl border border-gray-200 pl-12 pr-3.5 py-2.5 text-sm font-semibold text-gray-900 focus:border-emerald-500 focus:outline-hidden" required />
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  <button type="button" onClick={() => addAmount(250000)} className="px-1.5 py-0.5 text-[9px] bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-md transition-colors cursor-pointer">+250k</button>
                  <button type="button" onClick={() => addAmount(500000)} className="px-1.5 py-0.5 text-[9px] bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-md transition-colors cursor-pointer">+500k</button>
                  <button type="button" onClick={() => addAmount(1000000)} className="px-1.5 py-0.5 text-[9px] bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-md transition-colors cursor-pointer">+1.0M</button>
                </div>
              </div>

              <div className="space-y-2 text-left">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex justify-between items-center"><span>5. Balance (UGX)</span><span className="text-[9px] text-emerald-600 normal-case font-medium">Auto-calculated</span></label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-xs font-bold text-gray-400">UGX</span>
                  <input type="text" value={balance} onChange={(e) => handleBalanceChange(e.target.value)} placeholder="e.g. 1,200,000" className="w-full rounded-xl border border-gray-200 pl-12 pr-3.5 py-2.5 text-sm font-semibold text-gray-900 focus:border-emerald-500 focus:outline-hidden" />
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  <button type="button" onClick={() => addBalance(250000)} className="px-1.5 py-0.5 text-[9px] bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-md transition-colors cursor-pointer">+250k</button>
                  <button type="button" onClick={() => addBalance(500000)} className="px-1.5 py-0.5 text-[9px] bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-md transition-colors cursor-pointer">+500k</button>
                  <button type="button" onClick={() => setBalance("0")} className="px-1.5 py-0.5 text-[9px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-md transition-colors cursor-pointer">Nil</button>
                </div>
              </div>
            </div>

            {/* Date & Purpose */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 text-left">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">6. Date of Payment</label>
                <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-hidden" required />
              </div>
              <div className="space-y-2 text-left">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">7. Purpose of Payment</label>
                <input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Registration / Operations Capitation" className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-hidden" />
              </div>
            </div>

            {/* Channel Selection */}
            <div className="space-y-3 text-left">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">8. Delivery Channel Format</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { name: "WhatsApp" as ChannelType, icon: <MessageSquare className="w-4 h-4" />, desc: "Rich Text, Emojis" },
                  { name: "SMS" as ChannelType, icon: <Smartphone className="w-4 h-4" />, desc: "160 chars, Short Code" },
                  { name: "Email" as ChannelType, icon: <Mail className="w-4 h-4" />, desc: "Structured, Subject" },
                  { name: "Official Letter" as ChannelType, icon: <FileText className="w-4 h-4" />, desc: "Formal PDF/Print" },
                ].map((ch) => {
                  const isSelected = channel === ch.name;
                  return (
                    <button key={ch.name} type="button" onClick={() => setChannel(ch.name)} className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${isSelected ? "border-emerald-600 bg-emerald-50/40 text-emerald-950 shadow-xs" : "border-gray-200 hover:border-emerald-200 text-gray-700"}`}>
                      <div className="flex items-center justify-between w-full">
                        <span className={isSelected ? "text-emerald-700" : "text-gray-400"}>{ch.icon}</span>
                        <span className="text-[9px] text-gray-400 bg-gray-100 px-1 py-0.5 rounded uppercase font-bold">{ch.name === "SMS" ? "Text" : "Doc"}</span>
                      </div>
                      <div className="mt-2 text-left">
                        <div className="text-xs font-bold">{ch.name}</div>
                        <div className="text-[9px] text-gray-400 font-normal line-clamp-1 truncate">{ch.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tone & Language */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 text-left">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">9. Communication Tone</label>
                <select value={tone} onChange={(e) => setTone(e.target.value as ToneType)} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-hidden">
                  <option value="Professional">💼 Professional & Direct</option>
                  <option value="Polite">🤝 Polite & Respectful</option>
                  <option value="Urgent">⚠️ Urgent (Requires Verification)</option>
                  <option value="Friendly">😊 Friendly & Cooperative</option>
                  <option value="Direct">🎯 Concise & Clear</option>
                </select>
              </div>
              <div className="space-y-2 text-left">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">10. Language Style</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value as LanguageType)} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-hidden">
                  <option value="English">🇬🇧 English (Standard Official)</option>
                  <option value="Luganda">🇺🇬 Luganda (Central/Southern Region)</option>
                  <option value="Swahili">🇰🇪 Swahili (East African Trade)</option>
                </select>
              </div>
            </div>

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-3 rounded-xl text-left font-medium">⚠️ {errorMessage}</div>
            )}

            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold text-sm px-6 py-3.5 rounded-xl shadow-md shadow-emerald-100 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed">
              <Sparkles className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Generating Payment Draft..." : "Generate Verification Message"}
            </button>
          </form>
        </div>

        {/* Preview Side */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          <PhoneSimulator message={activeMessage} isLoading={loading} onUpdateMessage={handleUpdateMessage} />
        </div>
      </div>

      {/* History */}
      <div className="border-t border-gray-200 pt-8">
        <HistoryLog history={history} onSelect={handleSelectHistoryItem} onDelete={handleDeleteHistoryItem} onClearAll={handleClearAllHistory} />
      </div>
    </div>
  );
}
