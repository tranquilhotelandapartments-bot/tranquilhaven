import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Folder, 
  FileText, 
  Upload, 
  Trash2, 
  Search, 
  Send, 
  RefreshCw, 
  Plus, 
  Download, 
  Mail, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Cloud, 
  ChevronRight, 
  Inbox, 
  User, 
  X,
  FileCode,
  Sparkles
} from 'lucide-react';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  body: string;
}

export default function WorkspaceTab() {
  const { googleToken, connectWorkspace, profile } = useAuth();
  
  // Connection state
  const [connecting, setConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Active sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'drive' | 'gmail'>('drive');
  
  // Drive States
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveSearch, setDriveSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  
  // Upload States
  const [uploadName, setUploadName] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadMime, setUploadMime] = useState('text/plain');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  // Gmail States
  const [gmailMessages, setGmailMessages] = useState<GmailMessage[]>([]);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailSearch, setGmailSearch] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<GmailMessage | null>(null);
  
  // Compose States
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  // High-fidelity Mock/Simulated databases for offline/bypass testing
  const [mockFiles, setMockFiles] = useState<DriveFile[]>([
    {
      id: 'mock-file-1',
      name: 'Q3_Haven_Operating_Budget.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: '248500',
      createdTime: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
      modifiedTime: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      webViewLink: '#'
    },
    {
      id: 'mock-file-2',
      name: 'Staff_Shift_Handover_Guidelines.pdf',
      mimeType: 'application/pdf',
      size: '1250000',
      createdTime: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
      modifiedTime: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
      webViewLink: '#'
    },
    {
      id: 'mock-file-3',
      name: 'Emergency_Evacuation_Protocols.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: '482000',
      createdTime: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      modifiedTime: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      webViewLink: '#'
    },
    {
      id: 'mock-file-4',
      name: 'Haven_VIP_Guest_Arrivals.csv',
      mimeType: 'text/csv',
      size: '42000',
      createdTime: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      modifiedTime: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      webViewLink: '#'
    },
    {
      id: 'mock-file-5',
      name: 'Lobby_Renovation_Floorplan.png',
      mimeType: 'image/png',
      size: '4500000',
      createdTime: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
      modifiedTime: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
      webViewLink: '#'
    }
  ]);

  const [mockEmails, setMockEmails] = useState<GmailMessage[]>([
    {
      id: 'mock-mail-1',
      threadId: 'mock-thread-1',
      subject: 'Re: Grand Ballroom Gala Preparations',
      from: 'Director Michael <director@haven.com>',
      date: new Date(Date.now() - 2 * 3600 * 1000).toUTCString(),
      snippet: 'Please ensure the catering crew is briefed on the VIP allergy requirements. Let\'s make this perfect.',
      body: 'Hi team,\n\nI have reviewed the ballroom floor plan and the guest list. Please make sure the catering crew is fully briefed on the VIP food allergies. Let\'s ensure the layout has proper flow and high-fidelity details.\n\nThanks,\nMichael'
    },
    {
      id: 'mock-mail-2',
      threadId: 'mock-thread-2',
      subject: 'Invoice Approvals for HVAC Upgrades',
      from: 'Finance Unit <accounting@haven.com>',
      date: new Date(Date.now() - 24 * 3600 * 1000).toUTCString(),
      snippet: 'The maintenance invoice for the primary HVAC compressor has been reviewed and cleared for sign-off.',
      body: 'Dear Manager,\n\nWe have received and approved invoice #HAV-2026-891 from ClimateControl Inc. representing repairs to the main lobby HVAC system. Ready for final Director countersign.\n\nBest,\nFinance Unit'
    },
    {
      id: 'mock-mail-3',
      threadId: 'mock-thread-3',
      subject: 'VIP Late Check-in Notification',
      from: 'Front Desk <reception@haven.com>',
      date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toUTCString(),
      snippet: 'Guest Lord Sterling will be arriving around 11:45 PM. Please have a hot towel and standard vintage champagne prepared.',
      body: 'Hello Team,\n\nLord Sterling called to confirm they are delayed at the airport. Estimated check-in time is now 11:45 PM. Ensure standard VIP protocol: hot towel on arrival and chilled vintage champagne in Suite 404.\n\nRegards,\nReception Unit'
    },
    {
      id: 'mock-mail-4',
      threadId: 'mock-thread-4',
      subject: 'Incident Log: Main Gates - 2026-06-24',
      from: 'Auditing Security <security@haven.com>',
      date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toUTCString(),
      snippet: 'No major security breaches detected. Standard round checks completed at 0200 and 0400.',
      body: 'Director,\n\nStandard gate inspection log completed for yesterday shift. Perimeter fence fully secure. Cameras functional. Patrols completed on schedule.\n\nSecurity Shift Lead'
    }
  ]);

  // Connect Google account handler
  const handleConnect = async () => {
    setConnecting(true);
    setErrorMessage(null);
    try {
      await connectWorkspace();
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setErrorMessage("This domain is not authorized for Google Sign-In in your Firebase Console. Please verify your Firebase console settings.");
      } else {
        setErrorMessage(err.message || 'Failed to authenticate Workspace APIs.');
      }
    } finally {
      setConnecting(false);
    }
  };

  // Google Drive REST fetch
  const fetchDrive = useCallback(async (token: string, query = '') => {
    setDriveLoading(true);
    setErrorMessage(null);
    try {
      if (token.startsWith('mock-')) {
        await new Promise((resolve) => setTimeout(resolve, 450));
        const filtered = mockFiles.filter((f) =>
          f.name.toLowerCase().includes(query.toLowerCase())
        );
        setDriveFiles(filtered);
        return;
      }
      const q = query ? `name contains '${query}' and trashed = false` : 'trashed = false';
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink)&pageSize=20`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to retrieve Drive files.');
      }
      
      const data = await res.json();
      setDriveFiles(data.files || []);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error communicating with Google Drive API.');
    } finally {
      setDriveLoading(false);
    }
  }, [mockFiles]);

  // Gmail REST fetch
  const fetchGmail = useCallback(async (token: string, query = '') => {
    setGmailLoading(true);
    setErrorMessage(null);
    try {
      if (token.startsWith('mock-')) {
        await new Promise((resolve) => setTimeout(resolve, 450));
        const filtered = mockEmails.filter((m) =>
          m.subject.toLowerCase().includes(query.toLowerCase()) ||
          m.from.toLowerCase().includes(query.toLowerCase()) ||
          m.snippet.toLowerCase().includes(query.toLowerCase())
        );
        setGmailMessages(filtered);
        return;
      }
      const q = query ? encodeURIComponent(query) : '';
      const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=12${q ? `&q=${q}` : ''}`;
      
      const listRes = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!listRes.ok) {
        const errData = await listRes.json();
        throw new Error(errData.error?.message || 'Failed to list Gmail inbox.');
      }
      
      const listData = await listRes.json();
      const messages = listData.messages || [];
      
      // Fetch details for each message
      const details = await Promise.all(
        messages.map(async (msg: any) => {
          const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!detailRes.ok) return null;
          const detailData = await detailRes.json();
          
          const headers = detailData.payload?.headers || [];
          const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
          const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown';
          const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';
          
          return {
            id: detailData.id,
            threadId: detailData.threadId,
            subject,
            from,
            date,
            snippet: detailData.snippet || '',
            body: detailData.snippet || ''
          };
        })
      );
      
      setGmailMessages(details.filter((m) => m !== null) as GmailMessage[]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error communicating with Gmail API.');
    } finally {
      setGmailLoading(false);
    }
  }, [mockEmails]);

  // Trigger loads on token change or active sub-tab change
  useEffect(() => {
    if (googleToken) {
      if (activeSubTab === 'drive') {
        fetchDrive(googleToken, driveSearch);
      } else {
        fetchGmail(googleToken, gmailSearch);
      }
    }
  }, [googleToken, activeSubTab, fetchDrive, fetchGmail, driveSearch, gmailSearch]);

  // Upload file handler
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleToken) return;
    if (!uploadName) {
      alert('Please specify a filename.');
      return;
    }
    
    setUploading(true);
    setUploadSuccess(false);
    try {
      if (googleToken.startsWith('mock-')) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const newFile: DriveFile = {
          id: `mock-file-${Date.now()}`,
          name: uploadName,
          mimeType: uploadMime,
          size: String(uploadContent.length || 1024),
          createdTime: new Date().toISOString(),
          modifiedTime: new Date().toISOString(),
          webViewLink: '#'
        };
        setMockFiles((prev) => [newFile, ...prev]);
        setUploadSuccess(true);
        setUploadName('');
        setUploadContent('');
        return;
      }
      const metadata = { name: uploadName, mimeType: uploadMime };
      const boundary = 'tranquil_boundary_upload';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;
      
      const body =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${uploadMime}\r\n\r\n` +
        uploadContent +
        closeDelimiter;

      const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${googleToken}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body
      });
      
      if (!res.ok) {
        throw new Error('Failed to upload file.');
      }
      
      setUploadSuccess(true);
      setUploadName('');
      setUploadContent('');
      fetchDrive(googleToken, driveSearch);
    } catch (err: any) {
      alert(err.message || 'Error uploading to Drive');
    } finally {
      setUploading(false);
    }
  };

  // Drag and drop text upload helper
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      setUploadName(file.name);
      setUploadMime(file.type || 'text/plain');
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadContent(event.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  };

  // Delete file with confirmation dialog
  const handleDeleteFile = async (fileId: string, fileName: string) => {
    const confirmed = window.confirm(`Are you sure you want to permanently delete "${fileName}" from Google Drive? This action is irreversible.`);
    if (!confirmed || !googleToken) return;

    try {
      if (googleToken.startsWith('mock-')) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        setMockFiles((prev) => prev.filter((f) => f.id !== fileId));
        setSelectedFile(null);
        alert('File successfully deleted from Google Drive (Simulated).');
        return;
      }
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${googleToken}` }
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete the file.');
      }
      
      setSelectedFile(null);
      fetchDrive(googleToken, driveSearch);
      alert('File successfully deleted from Google Drive.');
    } catch (err: any) {
      alert(err.message || 'Error deleting file.');
    }
  };

  // Send Email handler
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleToken) return;
    if (!emailTo || !emailSubject || !emailBody) {
      alert('Please fill out all fields.');
      return;
    }

    setSendingEmail(true);
    setEmailSuccess(false);
    try {
      if (googleToken.startsWith('mock-')) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        const newMail: GmailMessage = {
          id: `mock-mail-${Date.now()}`,
          threadId: `mock-thread-${Date.now()}`,
          subject: emailSubject,
          from: `${profile?.fullName || 'Active Staff'} <${profile?.email || 'staff@haven.com'}>`,
          date: new Date().toUTCString(),
          snippet: emailBody.substring(0, 80) + (emailBody.length > 80 ? '...' : ''),
          body: emailBody
        };
        setMockEmails((prev) => [newMail, ...prev]);
        setEmailSuccess(true);
        setEmailTo('');
        setEmailSubject('');
        setEmailBody('');
        return;
      }
      const emailLines = [
        `To: ${emailTo}`,
        `Subject: ${emailSubject}`,
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        emailBody
      ];
      const emailContent = emailLines.join('\n');
      const encodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      
      const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${googleToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encodedEmail })
      });
      
      if (!res.ok) {
        throw new Error('Failed to send email.');
      }
      
      setEmailSuccess(true);
      setEmailTo('');
      setEmailSubject('');
      setEmailBody('');
      fetchGmail(googleToken, gmailSearch);
    } catch (err: any) {
      alert(err.message || 'Error sending email via Gmail.');
    } finally {
      setSendingEmail(false);
    }
  };

  // Quick preset helper to write template emails
  const selectEmailPreset = (toEmail: string, subjectLine: string, messageBody: string) => {
    setEmailTo(toEmail);
    setEmailSubject(subjectLine);
    setEmailBody(messageBody);
    setEmailSuccess(false);
  };

  // Human-readable size parser
  const parseSize = (bytesStr?: string) => {
    if (!bytesStr) return 'Folder / Virtual';
    const bytes = parseInt(bytesStr);
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-150 pb-4 gap-4">
        <div>
          <h2 className="font-display font-black text-xl text-black uppercase tracking-wide flex items-center gap-2">
            <Cloud className="w-5 h-5 text-[#a89078]" />
            Tranquil Workspace Integration Hub
          </h2>
          <p className="text-xs text-zinc-500 font-sans mt-0.5">
            Synchronize, list, search, and manage Google Workspace files and send secure administrative communication emails.
          </p>
        </div>
        <div>
          {googleToken ? (
            googleToken.startsWith('mock-') ? (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-[10.5px] text-amber-800 font-black tracking-wide uppercase">
                <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
                Workspace Simulator Mode Active
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-250 px-3 py-1.5 rounded-lg text-[10.5px] text-emerald-800 font-black tracking-wide uppercase">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Connected Live to Google APIs
              </div>
            )
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-4 py-2 bg-black hover:bg-zinc-900 text-[#f5f0eb] font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50 border-none"
            >
              {connecting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Granting Handshake...
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  Connect Google Workspace
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-850 text-xs p-3.5 rounded-xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">Workspace Communication Halt</p>
            <p className="mt-0.5 font-sans text-red-700 leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {!googleToken ? (
        <div className="bg-[#faf8f5] border border-dashed border-[#e6e2da] p-12 text-center rounded-2xl max-w-xl mx-auto space-y-5 shadow-sm">
          <div className="w-16 h-16 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <Cloud className="w-8 h-8 text-[#a89078] animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="font-display font-black text-sm uppercase text-zinc-800">Connection Credentials Required</h3>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-md mx-auto font-sans">
              To utilize actual, live Google Workspace features within Tranquil Haven, you must establish a secure line of communication with your Google Account.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-5 py-2.5 bg-[#a89078] hover:bg-[#927c66] text-white font-bold text-xs uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 mx-auto cursor-pointer border-none shadow-sm"
            >
              <Cloud className="w-4 h-4" />
              Authorize Drive & Gmail Accounts
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Workspace Sub-tabs selector */}
          <div className="flex border-b border-zinc-200 gap-1">
            <button
              onClick={() => setActiveSubTab('drive')}
              className={`px-4 py-2.5 font-sans text-xs font-bold tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 cursor-pointer bg-transparent border-none ${
                activeSubTab === 'drive'
                  ? 'border-black text-black font-black'
                  : 'border-transparent text-zinc-500 hover:text-black'
              }`}
            >
              <Folder className="w-4 h-4" />
              Google Drive Files
            </button>
            <button
              onClick={() => setActiveSubTab('gmail')}
              className={`px-4 py-2.5 font-sans text-xs font-bold tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 cursor-pointer bg-transparent border-none ${
                activeSubTab === 'gmail'
                  ? 'border-black text-black font-black'
                  : 'border-transparent text-zinc-500 hover:text-black'
              }`}
            >
              <Mail className="w-4 h-4" />
              Gmail Communicator
            </button>
          </div>

          {/* ACTIVE CONTENT VIEW */}
          {activeSubTab === 'drive' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT: Files browser list & Upload Form */}
              <div className="lg:col-span-8 space-y-6">
                {/* Search & Actions Bar */}
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search files in Google Drive..."
                      value={driveSearch}
                      onChange={(e) => setDriveSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-sans placeholder-zinc-400 focus:outline-none focus:border-zinc-400"
                    />
                  </div>
                  <button
                    onClick={() => fetchDrive(googleToken, driveSearch)}
                    disabled={driveLoading}
                    className="px-3.5 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold text-xs uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-white"
                    title="Refresh Files"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${driveLoading ? 'animate-spin' : ''}`} />
                    <span>Sync</span>
                  </button>
                </div>

                {/* Files list table */}
                <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="p-3 bg-[#faf9f6] border-b border-zinc-150 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-sans">
                      Drive Document Directory
                    </span>
                    <span className="text-[9px] font-mono bg-zinc-200 text-zinc-750 px-2 py-0.5 rounded">
                      {driveFiles.length} item(s) found
                    </span>
                  </div>

                  {driveLoading ? (
                    <div className="py-20 text-center space-y-3">
                      <RefreshCw className="w-8 h-8 text-[#a89078] animate-spin mx-auto" />
                      <p className="text-xs text-zinc-400 font-sans">Querying Google Cloud directory storage...</p>
                    </div>
                  ) : driveFiles.length === 0 ? (
                    <div className="py-20 text-center space-y-2">
                      <Folder className="w-12 h-12 text-zinc-200 mx-auto" />
                      <p className="text-xs text-zinc-650 font-sans">No documents match the search criteria or directory is empty.</p>
                      <p className="text-[10px] text-zinc-400 font-sans">Try uploading a text file below to initiate storage logs.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-150">
                      {driveFiles.map((file) => {
                        const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                        return (
                          <div
                            key={file.id}
                            onClick={() => setSelectedFile(file)}
                            className={`p-3.5 flex items-center justify-between hover:bg-[#faf9f6] transition-all cursor-pointer ${
                              selectedFile?.id === file.id ? 'bg-[#faf6f0]' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {isFolder ? (
                                <Folder className="w-5 h-5 text-amber-500 flex-shrink-0" />
                              ) : file.mimeType.includes('pdf') ? (
                                <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                              ) : file.mimeType.includes('spreadsheet') || file.name.endsWith('.csv') ? (
                                <FileCode className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                              ) : (
                                <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-zinc-900 truncate">{file.name}</p>
                                <p className="text-[10px] text-zinc-400 truncate font-sans mt-0.5">
                                  Type: {file.mimeType.split('.').pop() || file.mimeType} • Size: {parseSize(file.size)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9.5px] text-zinc-400 font-sans">
                                {file.createdTime ? new Date(file.createdTime).toLocaleDateString() : 'N/A'}
                              </span>
                              <ChevronRight className="w-4 h-4 text-zinc-350" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Upload / Create New File Card */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="border-b border-zinc-100 pb-2.5">
                    <h3 className="font-display font-black text-xs uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-[#a89078]" />
                      Deploy / Transmit Document to Drive
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-sans mt-0.5">Create a clean plain text or JSON document directly inside your Google Cloud environment.</p>
                  </div>

                  {uploadSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-lg flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      File successfully dispatched and persisted to Google Drive!
                    </div>
                  )}

                  <form onSubmit={handleUpload} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">Filename (e.g. daily_audit.txt) *</label>
                        <input
                          type="text"
                          required
                          value={uploadName}
                          onChange={(e) => {
                            setUploadName(e.target.value);
                            setUploadSuccess(false);
                          }}
                          placeholder="daily_financial_recap.txt"
                          className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-sans placeholder-zinc-400 focus:outline-none focus:border-zinc-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">Content MIME Type</label>
                        <select
                          value={uploadMime}
                          onChange={(e) => setUploadMime(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-sans focus:outline-none focus:border-zinc-400"
                        >
                          <option value="text/plain">Plain Text (.txt)</option>
                          <option value="application/json">JSON Metadata (.json)</option>
                          <option value="text/html">HTML Document (.html)</option>
                          <option value="text/csv">Comma-separated Values (.csv)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">
                        Document Body Content *
                      </label>
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        className={`transition-all duration-150 ${
                          dragOver ? 'border-[#a89078] bg-[#faf6f0]/60' : ''
                        }`}
                      >
                        <textarea
                          required
                          value={uploadContent}
                          onChange={(e) => {
                            setUploadContent(e.target.value);
                            setUploadSuccess(false);
                          }}
                          placeholder="Type or paste document content here... (Or drag and drop a local .txt file to auto-populate)"
                          rows={4}
                          className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-lg text-xs font-mono placeholder-zinc-400 focus:outline-none focus:border-zinc-400"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={uploading}
                        className="px-4 py-2 bg-[#a89078] hover:bg-[#927c66] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border-none shadow-sm"
                      >
                        {uploading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Transmit Document
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* RIGHT: File Details Panel */}
              <div className="lg:col-span-4">
                {selectedFile ? (
                  <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-sm sticky top-6">
                    <div className="flex justify-between items-start border-b border-zinc-100 pb-3">
                      <div>
                        <span className="text-[9px] font-bold bg-[#faf6f0] border border-[#f3eee5] text-[#a89078] px-2 py-0.5 rounded uppercase font-sans">
                          Metadata Detail
                        </span>
                        <h3 className="font-display font-black text-sm text-zinc-800 uppercase mt-1.5 break-all">
                          {selectedFile.name}
                        </h3>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="p-1 text-zinc-400 hover:text-black hover:bg-zinc-50 rounded-lg bg-transparent border-none cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3 text-[11px] font-sans text-zinc-650 leading-relaxed">
                      <div>
                        <span className="font-bold text-zinc-400 block uppercase text-[8.5px] tracking-widest font-sans">Unique File Identifier</span>
                        <code className="text-[9.5px] bg-zinc-50 border border-zinc-150 px-1.5 py-0.5 rounded font-mono select-all block break-all mt-0.5 text-zinc-900">
                          {selectedFile.id}
                        </code>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 border-t border-b border-zinc-100 py-3">
                        <div>
                          <span className="font-bold text-zinc-400 block uppercase text-[8.5px] tracking-widest">Storage Size</span>
                          <span className="text-xs font-bold text-zinc-900">{parseSize(selectedFile.size)}</span>
                        </div>
                        <div>
                          <span className="font-bold text-zinc-400 block uppercase text-[8.5px] tracking-widest">MIME Type</span>
                          <span className="text-xs text-zinc-900 truncate block">{selectedFile.mimeType.split('/').pop() || selectedFile.mimeType}</span>
                        </div>
                      </div>

                      {selectedFile.createdTime && (
                        <div>
                          <span className="font-bold text-zinc-400 block uppercase text-[8.5px] tracking-widest">Registry Timestamp</span>
                          <span className="text-zinc-800 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            {new Date(selectedFile.createdTime).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {selectedFile.webViewLink && (
                        <div className="pt-2">
                          <a
                            href={selectedFile.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full inline-flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[10.5px] font-bold uppercase tracking-wider py-2 px-3 rounded-lg cursor-pointer transition-all border border-zinc-250 text-center select-none"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open File in Google Drive
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-dashed border-zinc-200 pt-3.5">
                      <button
                        onClick={() => handleDeleteFile(selectedFile.id, selectedFile.name)}
                        className="w-full inline-flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-800 hover:text-white text-red-700 text-[10.5px] font-black uppercase tracking-wider py-2.5 px-3 rounded-lg cursor-pointer transition-all border border-red-200 text-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Permanently Delete Document
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#faf9f6] border border-dashed border-zinc-200 p-8 rounded-2xl text-center space-y-2 text-zinc-400 sticky top-6">
                    <FileText className="w-10 h-10 mx-auto text-zinc-250 animate-pulse" />
                    <p className="text-xs font-sans">Select a document from the directory list to examine specific metadata, secure download channels, or invoke deletions.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT: Gmail Inbox */}
              <div className="lg:col-span-8 space-y-6">
                {/* Search & Actions Bar */}
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search emails in your Gmail inbox..."
                      value={gmailSearch}
                      onChange={(e) => setGmailSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-sans placeholder-zinc-400 focus:outline-none focus:border-zinc-400"
                    />
                  </div>
                  <button
                    onClick={() => fetchGmail(googleToken, gmailSearch)}
                    disabled={gmailLoading}
                    className="px-3.5 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold text-xs uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-white"
                    title="Refresh Gmail"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${gmailLoading ? 'animate-spin' : ''}`} />
                    <span>Sync</span>
                  </button>
                </div>

                {/* Inbox message board */}
                <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="p-3 bg-[#faf9f6] border-b border-zinc-150 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-sans">
                      Secure Mailbox Feed (Direct Link)
                    </span>
                    <span className="text-[9px] font-mono bg-zinc-200 text-zinc-750 px-2 py-0.5 rounded">
                      {gmailMessages.length} message(s) loaded
                    </span>
                  </div>

                  {gmailLoading ? (
                    <div className="py-20 text-center space-y-3">
                      <RefreshCw className="w-8 h-8 text-[#a89078] animate-spin mx-auto" />
                      <p className="text-xs text-zinc-400 font-sans">Connecting live Gmail channels...</p>
                    </div>
                  ) : gmailMessages.length === 0 ? (
                    <div className="py-20 text-center space-y-2">
                      <Inbox className="w-12 h-12 text-zinc-200 mx-auto" />
                      <p className="text-xs text-zinc-650 font-sans">No message lines correspond with the current query parameters.</p>
                      <p className="text-[10px] text-zinc-400 font-sans">Try drafting a message on the sidebar to test out outgoing SMTP services.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-150">
                      {gmailMessages.map((msg) => {
                        const isSelected = selectedEmail?.id === msg.id;
                        return (
                          <div
                            key={msg.id}
                            onClick={() => setSelectedEmail(msg)}
                            className={`p-3.5 flex items-start justify-between hover:bg-[#faf9f6] transition-all cursor-pointer ${
                              isSelected ? 'bg-[#faf6f0]' : ''
                            }`}
                          >
                            <div className="flex gap-3 min-w-0 flex-1 pr-3">
                              <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 border border-zinc-200 text-[#a89078] font-bold text-xs uppercase font-sans">
                                {msg.from.trim().replace(/^"|"/g, '').charAt(0) || 'U'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                  <p className="text-xs font-bold text-zinc-900 truncate">{msg.from}</p>
                                  <span className="text-[9px] text-zinc-400 font-sans flex-shrink-0">
                                    {msg.date ? new Date(msg.date).toLocaleDateString() : 'N/A'}
                                  </span>
                                </div>
                                <p className="text-xs font-semibold text-zinc-800 mt-0.5 truncate">{msg.subject}</p>
                                <p className="text-[11px] text-zinc-500 font-sans mt-0.5 truncate leading-snug">
                                  {msg.snippet}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-350 self-center" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Send / Compose Outgoing Email Card */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="border-b border-zinc-100 pb-2.5">
                    <h3 className="font-display font-black text-xs uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-[#a89078]" />
                      Draft & Dispatch Outgoing Dispatch
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-sans mt-0.5">Transmit secure official communications directly to guests, contractors, or internal staff through real-time SMTP dispatch.</p>
                  </div>

                  {emailSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-lg flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Email message safely transmitted to target server! Check sent logs.
                    </div>
                  )}

                  {/* Quick Preset Buttons */}
                  <div className="space-y-1">
                    <span className="text-[8.5px] font-bold text-zinc-400 uppercase tracking-widest block font-sans">Template Presets</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => selectEmailPreset(
                          'jomasonbatson@gmail.com',
                          'TRANQUIL HAVEN - Daily Audit Notification Log',
                          `Dear Director,\n\nThis is an automated operational notification. The daily turnarounds, financial logs, and inventory parameters are verified and balanced.\n\nWarm regards,\nTranquil Workspace Auto-Log`
                        )}
                        className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[9.5px] font-bold rounded-md transition-all border border-zinc-200 cursor-pointer"
                      >
                        Notify Director
                      </button>
                      <button
                        type="button"
                        onClick={() => selectEmailPreset(
                          'julianne.moore@vip.com',
                          'Welcome back to TRANQUIL HAVEN, VIP Moore',
                          `Dear Julianne Moore,\n\nWe are excited for your upcoming check-in. Your Penthouse Suite 402 is fully prioritized and prepared with requested extra feather pillows.\n\nBest regards,\nFront Desk Guest Services`
                        )}
                        className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[9.5px] font-bold rounded-md transition-all border border-zinc-200 cursor-pointer"
                      >
                        VIP Welcome Message
                      </button>
                      <button
                        type="button"
                        onClick={() => selectEmailPreset(
                          'maintenance@tranquilhaven.com',
                          'URGENT: Maintenance Order Assigned',
                          `Attn: Maintenance Staff,\n\nPlease inspect the Bathroom light fixture in Room 102 immediately. Report completed status back on terminal upon resolution.\n\nThank you,\nAdministration Concierge`
                        )}
                        className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[9.5px] font-bold rounded-md transition-all border border-zinc-200 cursor-pointer"
                      >
                        Maintenance Dispatch
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleSendEmail} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">Recipient Email Address (To) *</label>
                        <input
                          type="email"
                          required
                          value={emailTo}
                          onChange={(e) => {
                            setEmailTo(e.target.value);
                            setEmailSuccess(false);
                          }}
                          placeholder="recipient@domain.com"
                          className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-sans placeholder-zinc-400 focus:outline-none focus:border-zinc-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">Subject Line *</label>
                        <input
                          type="text"
                          required
                          value={emailSubject}
                          onChange={(e) => {
                            setEmailSubject(e.target.value);
                            setEmailSuccess(false);
                          }}
                          placeholder="Enter mail subject..."
                          className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-sans placeholder-zinc-400 focus:outline-none focus:border-zinc-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">Email Message Body *</label>
                      <textarea
                        required
                        value={emailBody}
                        onChange={(e) => {
                          setEmailBody(e.target.value);
                          setEmailSuccess(false);
                        }}
                        placeholder="Draft your administrative email details here..."
                        rows={5}
                        className="w-full bg-zinc-50 border border-zinc-200 p-3 rounded-lg text-xs font-sans placeholder-zinc-400 focus:outline-none focus:border-zinc-400 leading-relaxed"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={sendingEmail}
                        className="px-4 py-2 bg-black hover:bg-zinc-900 text-[#f5f0eb] font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border-none shadow-md"
                      >
                        {sendingEmail ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Transmitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            Dispatch Email
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* RIGHT: Selected Email Panel */}
              <div className="lg:col-span-4">
                {selectedEmail ? (
                  <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-sm sticky top-6">
                    <div className="flex justify-between items-start border-b border-zinc-100 pb-3">
                      <div>
                        <span className="text-[9px] font-bold bg-[#faf6f0] border border-[#f3eee5] text-[#a89078] px-2 py-0.5 rounded uppercase font-sans">
                          Incoming Record
                        </span>
                        <h3 className="font-display font-black text-sm text-zinc-800 uppercase mt-1.5">
                          {selectedEmail.subject}
                        </h3>
                      </div>
                      <button
                        onClick={() => setSelectedEmail(null)}
                        className="p-1 text-zinc-400 hover:text-black hover:bg-zinc-50 rounded-lg bg-transparent border-none cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-4 text-[11px] font-sans text-zinc-650 leading-relaxed">
                      <div>
                        <span className="font-bold text-zinc-400 block uppercase text-[8.5px] tracking-widest font-sans">Sender (From)</span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-6 h-6 rounded-full bg-zinc-150 flex items-center justify-center font-bold font-sans text-[10px] text-zinc-700">
                            {selectedEmail.from.trim().replace(/^"|"/g, '').charAt(0) || 'U'}
                          </div>
                          <span className="text-zinc-900 font-bold font-sans break-all">{selectedEmail.from}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 border-t border-b border-zinc-100 py-3">
                        <div>
                          <span className="font-bold text-zinc-400 block uppercase text-[8.5px] tracking-widest">Time Registered</span>
                          <span className="text-zinc-800 font-sans block mt-0.5">{selectedEmail.date ? new Date(selectedEmail.date).toLocaleString() : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-zinc-400 block uppercase text-[8.5px] tracking-widest">Message ID</span>
                          <span className="text-zinc-700 font-mono truncate block mt-0.5 select-all text-[9.5px] bg-zinc-50 border border-zinc-200 px-1 py-0.5 rounded" title={selectedEmail.id}>
                            {selectedEmail.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="font-bold text-zinc-400 block uppercase text-[8.5px] tracking-widest">Snippet Content</span>
                        <div className="bg-[#fbfcfa] border border-zinc-150 p-3.5 rounded-xl font-sans text-[11.5px] leading-relaxed text-zinc-800 mt-1 max-h-80 overflow-y-auto whitespace-pre-line shadow-inner">
                          {selectedEmail.body}
                        </div>
                      </div>

                      <div className="pt-1.5">
                        <button
                          onClick={() => {
                            setEmailTo(selectedEmail.from.includes('<') ? selectedEmail.from.split('<')[1].replace('>', '') : selectedEmail.from);
                            setEmailSubject(`Re: ${selectedEmail.subject.startsWith('Re:') ? '' : 'Re: '}${selectedEmail.subject}`);
                            setEmailBody(`\n\n--- On ${new Date(selectedEmail.date).toLocaleString()}, ${selectedEmail.from} wrote:\n> ${selectedEmail.body.replace(/\n/g, '\n> ')}`);
                            setEmailSuccess(false);
                            alert('Drafting reply on bottom composer panel!');
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 bg-[#a89078] hover:bg-[#927c66] text-white text-[10.5px] font-bold uppercase tracking-wider py-2.5 px-3 rounded-lg cursor-pointer transition-all border-none shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Reply to This Email
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#faf9f6] border border-dashed border-zinc-200 p-8 rounded-2xl text-center space-y-2 text-zinc-400 sticky top-6">
                    <Mail className="w-10 h-10 mx-auto text-zinc-250 animate-pulse" />
                    <p className="text-xs font-sans">Select any email from your inbox thread list to preview subject outlines, sender properties, body paragraphs, and invoke quick replies.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
