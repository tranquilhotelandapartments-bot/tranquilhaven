import { useState } from 'react';
import { Send } from 'lucide-react';
import { motion } from 'motion/react';
import { GuestCRM, InternalMessage, MaintenanceTicket, SystemNotification } from './types';

interface GuestPortalProps {
  messages: InternalMessage[];
  guests: GuestCRM[];
  onAddMessage: (text: string) => void;
  onPostMaintenanceTicket: (t: MaintenanceTicket) => void;
  onAddNotification: (n: SystemNotification) => void;
  onPostServiceRequest?: (roomNo: string, requestType: string, details?: string) => void;
}

export function GuestPortalScreen({
  messages,
  guests,
  onAddMessage,
  onPostMaintenanceTicket,
  onAddNotification,
  onPostServiceRequest,
}: GuestPortalProps) {
  const fallbackGuest: GuestCRM = {
    id: 'TH-2026-TEMP',
    fullName: 'Guest User',
    phone: '+1 (555) 555-5555',
    email: 'guest@tranquilhaven.com',
    passport: 'US-AA000000',
    nationalId: 'NID-000000',
    emergencyContact: 'None',
    loyaltyPoints: 0,
    spendingHistory: 0,
    checkedInRoom: '402',
    historyLogs: []
  };

  const activeGuest = guests[0] || fallbackGuest;
  const [reqService, setReqService] = useState('');
  const [guestInboxInput, setGuestInboxInput] = useState('');
  const [ratings, setRatings] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [activeSection, setActiveSection] = useState<string>('all');

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestInboxInput.trim()) return;

    onAddMessage(guestInboxInput);
    const guestQuery = guestInboxInput;
    setGuestInboxInput('');

    setTimeout(() => {
      let botText = "Thank you for contacting Tranquil Haven Butler Team. Your prompt has been logged, we will fulfill this in under 10 minutes.";
      if (guestQuery.toLowerCase().includes('wifi') || guestQuery.toLowerCase().includes('internet')) {
        botText = "The secure high-speed Wi-Fi access SSID is 'Tranquil_Haven_VIP' and secure passcode is 'havenlyComfort2026'.";
      } else if (guestQuery.toLowerCase().includes('towel') || guestQuery.toLowerCase().includes('linen')) {
        botText = "Linen request received. Our cleaner James Chen has been dispatched with pristine organic cotton towels pack.";
      } else if (guestQuery.toLowerCase().includes('coffee') || guestQuery.toLowerCase().includes('food')) {
        botText = "Your artisanal coffee delivery is currently being prepared by the barista. Expect room arrival shortly.";
      }

      onAddMessage(`Tranquil Haven Bot: ${botText}`);
    }, 1200);
  };

  const handleRequestService = (service: string) => {
    const ticket: MaintenanceTicket = {
      id: `TCK-${Date.now().toString().slice(-4)}`,
      location: `Room ${activeGuest.checkedInRoom || '402'}`,
      issue: `Guest Requested Service: ${service}`,
      type: 'cleaning_services',
      category: 'Routine',
      status: 'ACTIVE',
      reportedTime: 'Just now',
      assignedStaff: 'Unassigned'
    };

    onPostMaintenanceTicket(ticket);

    onAddNotification({
      id: `N-${Date.now()}`,
      title: 'Guest Service Request',
      text: `${activeGuest.fullName} in suite ${activeGuest.checkedInRoom || '402'} requested '${service}'. Housekeeping queue updated.`,
      urgency: 'Normal',
      level: 1,
      timestamp: 'Just now',
      acknowledgedBy: []
    });

    alert(`Standard request dispatched: ${service}. Staff notified!`);
  };

  const handleSendFeedback = () => {
    if (!feedbackText.trim()) return;
    alert(`Thank you for your rating of ${ratings} stars! Sincere comments log saved.`);
    setFeedbackText('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto bg-surface-container-lowest border border-[#eae8e4] p-5 rounded-[40px] shadow-2xl relative my-4 w-full"
    >
      <div className="w-32 h-5 bg-black rounded-full mx-auto mb-4 relative flex items-center justify-center">
        <span className="w-1.5 h-1.5 bg-zinc-800 rounded-full block mr-10" />
      </div>

      <div className="space-y-5">

        <div className="text-center pb-3 border-b border-[#f4f1ee]">
          <span className="text-[9px] font-black uppercase text-[#a89078] tracking-[0.3em] block">Tranquil Haven Mobile Portal</span>
          <h3 className="font-display font-black text-xl text-black">Guest Digital Ledger</h3>
          <p className="text-[10px] text-zinc-400 font-mono">Welcome back, {activeGuest.fullName}</p>
        </div>

        <div className="bg-[#faf9f6]/80 border border-[#e6decb] p-3 rounded-2xl shadow-xs space-y-1.5">
          <span className="text-[8px] font-black uppercase text-[#a89078] tracking-[0.2em] font-display block text-center">Service Navigator</span>
          <select
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value)}
            className="bg-white border border-zinc-200 rounded-lg py-2 px-2.5 text-xs font-black uppercase text-zinc-850 outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer w-full text-center"
          >
            <option value="all">Show All Amenities</option>
            <option value="profile">Room & Stay profile information</option>
            <option value="amenities">Request Guest Service Amenities</option>
            <option value="butler-chat">Direct Butler Live Thread</option>
            <option value="feedback">Settle Departure Feedback</option>
          </select>
        </div>

        {(activeSection === 'all' || activeSection === 'profile') && (
        <div className="bg-[#f5f0eb] border border-black/10 rounded-2xl p-4 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-black uppercase text-zinc-700 tracking-wider font-display">Assigned Quarters</span>
            <span className="text-sm font-display font-black tracking-widest text-[#a89078]">SUITE {activeGuest.checkedInRoom || '402'}</span>
          </div>
          <div className="text-xs space-y-1 text-zinc-700 font-sans font-medium">
            <p>Reservation Status: <span className="font-bold text-emerald-800">Checked In</span></p>
            <p>Loyalty tier: <span className="text-amber-800 font-bold">Elite Black Label ({activeGuest.loyaltyPoints} PTS)</span></p>
            <p>Access SSID: <span className="font-mono bg-white px-1.5 rounded border border-zinc-200">Tranquil_Haven_VIP</span></p>
          </div>
        </div>
        )}

        {(activeSection === 'all' || activeSection === 'amenities') && (
        <div id="guest-service-request-box" className="bg-[#fbfcfa] border border-zinc-200 rounded-2xl p-4.5 space-y-3 shadow-xs">
          <span className="text-[10px] font-black uppercase text-zinc-700 tracking-wider font-display block">
            Request Guest Service Amenities
          </span>
          <div className="space-y-2.5">
            <div className="space-y-1">
              <label className="text-[9px] text-zinc-500 uppercase font-black">Amenity Type</label>
              <select
                value={reqService}
                onChange={(e) => setReqService(e.target.value)}
                className="w-full bg-white border border-zinc-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold font-sans outline-none focus:ring-1 focus:ring-zinc-400"
              >
                <option value="">-- Choose Amenity --</option>
                <option value="Tea">Tea</option>
                <option value="Coffee">Coffee</option>
                <option value="Food">Food (Room Service Order)</option>
                <option value="Water">Water (Still/Sparkling)</option>
                <option value="Laundry">Laundry Service</option>
                <option value="Extra Towels">Extra Towels Pack</option>
                <option value="Room Cleaning">Room Cleaning Turnaround</option>
                <option value="Airport Pickup">Airport Pickup Dispatch</option>
                <option value="Maintenance Assistance">Maintenance Technical Assistance</option>
                <option value="Custom Requests">Custom Request (Describe below)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-zinc-500 uppercase font-black block">Special Directions / Custom request details</label>
              <input
                type="text"
                id="guest-request-details"
                placeholder="E.g. Extra sugar, hot milk, or custom details..."
                className="w-full bg-white border border-zinc-200 px-3 py-1.5 rounded-lg text-xs"
              />
            </div>

            <button
              onClick={() => {
                const selectElement = reqService;
                if (!selectElement) {
                  alert('Please choose an amenity from the dropdown.');
                  return;
                }
                const detailsInput = (document.getElementById('guest-request-details') as HTMLInputElement)?.value || '';

                if (onPostServiceRequest) {
                  onPostServiceRequest(activeGuest.checkedInRoom || '402', selectElement, detailsInput);
                } else {
                  handleRequestService(`${selectElement} (${detailsInput})`);
                }

                setReqService('');
                if (document.getElementById('guest-request-details')) {
                  (document.getElementById('guest-request-details') as HTMLInputElement).value = '';
                }
                alert('Service request dispatched to hotel desk! Fulfilling in under 10 minutes.');
              }}
              className="w-full bg-black hover:bg-zinc-800 text-white font-extrabold text-[10px] uppercase tracking-wider py-2.5 rounded-xl transition cursor-pointer"
            >
              Request Service Button
            </button>
          </div>
        </div>
        )}

        {(activeSection === 'all' || activeSection === 'butler-chat') && (
        <div className="border border-[#f4f1ee] rounded-2.5xl p-3 bg-zinc-50 flex flex-col h-[200px]">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Direct Butler Live Thread</span>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 my-1.5 text-[10px]">
            {messages.slice(-4).map((m, t) => (
              <div key={t} className={`flex flex-col ${m.senderName === activeGuest.fullName ? 'items-end' : 'items-start'}`}>
                <span className="text-[7.5px] text-zinc-400 font-bold">{m.senderName}</span>
                <p className={`p-2 rounded-lg max-w-[80%] font-sans font-medium leading-relaxed ${
                  m.senderName === activeGuest.fullName ? 'bg-black text-[#f5f0eb] rounded-tr-none' : 'bg-neutral-150 text-zinc-800 rounded-tl-none'
                }`}>
                  {m.text}
                </p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendChat} className="flex gap-1">
            <input
              type="text"
              placeholder="Ask the desk butler..."
              value={guestInboxInput}
              onChange={(e) => setGuestInboxInput(e.target.value)}
              className="flex-1 bg-white border border-zinc-200 rounded-lg px-2.5 text-[10.5px] outline-none"
            />
            <button
              type="submit"
              className="bg-black text-white p-1 rounded-lg cursor-pointer"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>
        </div>
        )}

        {(activeSection === 'all' || activeSection === 'feedback') && (
        <div className="bg-[#fcf9f6] border border-zinc-200 rounded-2xl p-4.5 space-y-3">
          <span className="text-[9.5px] font-extrabold uppercase text-zinc-700 tracking-wider font-display block">Settle Feedback</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(st => (
              <button
                key={st}
                onClick={() => setRatings(st)}
                className={`text-sm cursor-pointer transition-all ${ratings >= st ? 'text-amber-500' : 'text-zinc-350'}`}
              >
                ★
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Your comments..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="flex-1 bg-white border border-zinc-200 px-3 py-1 text-xs rounded"
            />
            <button
              onClick={handleSendFeedback}
              className="bg-black hover:bg-neutral-800 text-[#f5f0eb] border-none text-[10px] uppercase font-black tracking-wide px-3 rounded cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
        )}

      </div>
    </motion.div>
  );
}
