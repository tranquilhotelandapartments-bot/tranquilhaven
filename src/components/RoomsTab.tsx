/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, Dispatch, SetStateAction, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Room, RoomStatusType } from '../types';

interface RoomsTabProps {
  rooms: Room[];
  setRooms: Dispatch<SetStateAction<Room[]>>;
}

export default function RoomsTab({ rooms, setRooms }: RoomsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFloor, setSelectedFloor] = useState<'All' | '1st Floor' | '2nd Floor' | '3rd Floor' | 'Penthouse'>('All');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Draft state variables for the inspection/modifier modal
  const [draftStatus, setDraftStatus] = useState<RoomStatusType>('Vacant');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftSubStatus, setDraftSubStatus] = useState('');
  const [draftId, setDraftId] = useState('');
  const [draftType, setDraftType] = useState('');
  const [draftFloor, setDraftFloor] = useState<'1st Floor' | '2nd Floor' | '3rd Floor' | 'Penthouse'>('1st Floor');
  const [isSaving, setIsSaving] = useState(false);

  // Add Room form state
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [newRoomId, setNewRoomId] = useState('');
  const [newRoomType, setNewRoomType] = useState('Deluxe King');
  const [newRoomFloor, setNewRoomFloor] = useState<'1st Floor' | '2nd Floor' | '3rd Floor' | 'Penthouse'>('1st Floor');
  const [newRoomStatus, setNewRoomStatus] = useState<RoomStatusType>('Vacant');
  const [newRoomNotes, setNewRoomNotes] = useState('');

  // Live calculated stats based on current room listings - honest & dynamic (no mocked offsets since we cleared standard list)
  const vacantCount = rooms.filter((r) => r.status === 'Vacant').length;
  const occupiedCount = rooms.filter((r) => r.status === 'Occupied').length;
  const dirtyCount = rooms.filter((r) => r.status === 'Dirty').length;
  const oooCount = rooms.filter((r) => r.status === 'Out of Order').length;

  // Filter the grid dynamically!
  const filteredRooms = rooms.filter((room) => {
    const matchesSearch =
      room.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (room.guestName && room.guestName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      room.type.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFloor = selectedFloor === 'All' || room.floor === selectedFloor;

    return matchesSearch && matchesFloor;
  });

  const handleCreateRoom = (e: FormEvent) => {
    e.preventDefault();
    if (!newRoomId.trim()) {
      alert("Please enter a room number or ID.");
      return;
    }
    // Check if ID already exists
    if (rooms.some(r => r.id.toLowerCase() === newRoomId.trim().toLowerCase())) {
      alert(`Room "${newRoomId.trim()}" already exists!`);
      return;
    }

    const newRoom: Room = {
      id: newRoomId.trim(),
      type: newRoomType,
      status: newRoomStatus,
      subStatus: newRoomStatus === 'Vacant' ? 'READY' : newRoomStatus === 'Dirty' ? 'IN QUEUE' : newRoomStatus === 'Out of Order' ? 'MAINTENANCE' : 'STAYOVER',
      floor: newRoomFloor,
      notes: newRoomNotes,
    };

    setRooms(prev => [...prev, newRoom]);
    setIsAddingRoom(false);
    // Reset form
    setNewRoomId('');
    setNewRoomType('Deluxe King');
    setNewRoomFloor('1st Floor');
    setNewRoomStatus('Vacant');
    setNewRoomNotes('');
  };

  const handleDeleteRoom = (roomId: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete Room ${roomId}?`)) {
      return;
    }
    setRooms(prev => prev.filter(r => r.id !== roomId));
    setSelectedRoom(null);
  };

  // Action: Open Modal
  const handleOpenModal = (room: Room) => {
    setSelectedRoom(room);
    setDraftId(room.id);
    setDraftType(room.type);
    setDraftFloor(room.floor);
    setDraftStatus(room.status);
    setDraftNotes(room.notes);
    setDraftSubStatus(room.subStatus);
  };

  // Action: Save Changes inside Room detailed sheet
  const handleSaveChanges = () => {
    if (!selectedRoom) return;

    if (!draftId.trim()) {
      alert("Room identification name/number cannot be empty.");
      return;
    }

    // Check unique constraint if the room id has changed
    if (draftId.trim().toLowerCase() !== selectedRoom.id.toLowerCase()) {
      if (rooms.some(r => r.id.toLowerCase() === draftId.trim().toLowerCase())) {
        alert(`Room "${draftId.trim()}" already exists!`);
        return;
      }
    }

    setIsSaving(true);
    setTimeout(() => {
      setRooms((prevRooms) =>
        prevRooms.map((r) => {
          if (r.id === selectedRoom.id) {
            // Determine secondary status tag based on selected main status
            let autoSub = draftSubStatus;
            if (draftStatus === 'Vacant' && r.status !== 'Vacant') {
              autoSub = 'READY';
            } else if (draftStatus === 'Dirty' && r.status !== 'Dirty') {
              autoSub = 'IN QUEUE';
            } else if (draftStatus === 'Out of Order') {
              autoSub = 'MAINTENANCE';
            }

            return {
              ...r,
              id: draftId.trim(),
              type: draftType.trim(),
              floor: draftFloor,
              status: draftStatus,
              notes: draftNotes,
              subStatus: autoSub,
              // Clean up guest name if room was marked vacant
              guestName: draftStatus === 'Vacant' ? undefined : r.guestName,
            };
          }
          return r;
        })
      );
      setIsSaving(false);
      setSelectedRoom(null);
    }, 600);
  };

  const floorsList: Array<'All' | '1st Floor' | '2nd Floor' | '3rd Floor' | 'Penthouse'> = [
    'All',
    '1st Floor',
    '2nd Floor',
    '3rd Floor',
    'Penthouse',
  ];

  return (
    <div className="space-y-6">
      
      {/* Dynamic Status Badging Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Vacant Card */}
        <div className="bg-surface-container-lowest p-4 rounded-lg card-shadow flex flex-col justify-between h-28 border-l-4 border-green-500">
          <span className="text-on-surface-variant font-bold text-[11px] uppercase tracking-wider">
            VACANT
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-primary">{vacantCount}</span>
            <span className="text-green-700 text-xs font-bold tracking-wider uppercase">
              READY
            </span>
          </div>
        </div>

        {/* Occupied Card */}
        <div className="bg-surface-container-lowest p-4 rounded-lg card-shadow flex flex-col justify-between h-28 border-l-4 border-blue-500">
          <span className="text-on-surface-variant font-bold text-[11px] uppercase tracking-wider">
            OCCUPIED
          </span>
          <span className="font-display text-3xl font-extrabold text-primary">{occupiedCount}</span>
        </div>

        {/* Dirty Card */}
        <div className="bg-surface-container-lowest p-4 rounded-lg card-shadow flex flex-col justify-between h-28 border-l-4 border-amber-500">
          <span className="text-on-surface-variant font-bold text-[11px] uppercase tracking-wider">
            DIRTY
          </span>
          <span className="font-display text-3xl font-extrabold text-primary">{dirtyCount}</span>
        </div>

        {/* OOO Card */}
        <div className="bg-surface-container-lowest p-4 rounded-lg card-shadow flex flex-col justify-between h-28 border-l-4 border-red-500">
          <span className="text-on-surface-variant font-bold text-[11px] uppercase tracking-wider">
            OUT OF ORDER
          </span>
          <span className="font-display text-3xl font-extrabold text-primary">{oooCount}</span>
        </div>
      </section>

      {/* Filter, Search, and Create Input Area */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-grow w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
            search
          </span>
          <input
            className="w-full bg-surface-container-low pl-10 pr-4 py-3 rounded-lg border border-[#eae8e4] focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-outline text-sm"
            placeholder="Search room, guest type or number..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Floor selector buttons */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 w-full md:w-auto">
          {floorsList.map((floor) => {
            const isActive = selectedFloor === floor;
            return (
              <button
                key={floor}
                onClick={() => setSelectedFloor(floor)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all duration-150 ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                }`}
              >
                {floor === 'All' ? 'All Floors' : floor}
              </button>
            );
          })}
        </div>

        {/* Add Room Trigger button */}
        <button
          onClick={() => setIsAddingRoom(true)}
          className="flex items-center gap-1.5 bg-primary text-on-primary px-4 py-3 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-opacity-95 active:scale-95 transition-all shadow-sm cursor-pointer whitespace-nowrap w-full md:w-auto justify-center"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Add Room
        </button>
      </div>

      {/* Interactive Rooms Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredRooms.map((room) => {
            const isVacant = room.status === 'Vacant';
            const isDirty = room.status === 'Dirty';
            const isOccupied = room.status === 'Occupied';
            const isOOO = room.status === 'Out of Order';

            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                key={room.id}
                onClick={() => handleOpenModal(room)}
                className="bg-surface-container-lowest p-4 rounded-lg card-shadow border border-[#f4f1ee] cursor-pointer transition-all duration-150 hover:scale-[1.03] active:scale-95 hover:shadow-md flex flex-col justify-between min-h-[140px]"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-display font-black text-lg text-primary">{room.id}</span>
                    
                    {/* Status badges */}
                    {isVacant && (
                      <span className="px-2 py-0.5 rounded bg-[#e8f5e9] text-[#2e7d32] font-semibold text-[9px] uppercase tracking-wider">
                        VACANT
                      </span>
                    )}
                    {isDirty && (
                      <span className="px-2 py-0.5 rounded bg-[#fff3e0] text-[#ef6c00] font-semibold text-[9px] uppercase tracking-wider">
                        DIRTY
                      </span>
                    )}
                    {isOccupied && (
                      <span className="px-2 py-0.5 rounded bg-[#e3f2fd] text-[#1565c0] font-semibold text-[9px] uppercase tracking-wider">
                        OCCUPIED
                      </span>
                    )}
                    {isOOO && (
                      <span className="px-2 py-0.5 rounded bg-[#ffebee] text-[#c62828] font-semibold text-[9px] uppercase tracking-wider">
                        OOO
                      </span>
                    )}
                  </div>
                  <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider truncate mb-1">
                    {room.type}
                  </p>
                  <p className="text-xs text-outline truncate">
                    {isOccupied ? room.guestName : `Floor: ${room.floor}`}
                  </p>
                </div>

                {/* Sub status row */}
                <div className="mt-3 pt-2.5 border-t border-[#f4f1ee] flex items-center gap-1">
                  {isVacant && (
                    <div className="flex items-center gap-1 text-[#2e7d32]">
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      <span className="text-[10px] font-bold tracking-wider uppercase">{room.subStatus}</span>
                    </div>
                  )}
                  {isDirty && (
                    <div className="flex items-center gap-1 text-[#ef6c00]">
                      <span className="material-symbols-outlined text-base">mop</span>
                      <span className="text-[10px] font-bold tracking-wider uppercase">{room.subStatus}</span>
                    </div>
                  )}
                  {isOccupied && (
                    <div className="flex items-center gap-1 text-on-surface-variant">
                      <span className="material-symbols-outlined text-base">
                        {room.subStatus === 'PRIVACY' ? 'do_not_disturb_on' : 'cleaning_services'}
                      </span>
                      <span className="text-[10px] font-bold tracking-wider uppercase truncate max-w-[80px]">
                        {room.subStatus}
                      </span>
                    </div>
                  )}
                  {isOOO && (
                    <div className="flex items-center gap-1 text-[#c62828]">
                      <span className="material-symbols-outlined text-base">build</span>
                      <span className="text-[10px] font-bold tracking-wider uppercase">{room.subStatus}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Housekeeping Overview Bento Box Banner */}
        <div className="col-span-2 bg-primary p-4 rounded-lg flex flex-col justify-between text-on-primary card-shadow min-h-[140px]">
          <div>
            <h3 className="font-display font-extrabold text-base mb-0.5">Housekeeping Overview</h3>
            <p className="text-xs opacity-75 font-sans">Shift: Morning (07:00 - 15:00)</p>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex -space-x-2">
              <img
                alt="Housekeeper"
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full border-2 border-primary object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZjS0trWXYJP40zUOWpaPI3jvp255h98Kop1f6hafOQdLPjAsgWJwB9q9YrJsm6JPSM-7aSz2Cp95DtdvbF7yEMYL70n1OnF_aBqgHNUJMBcowbt8pcAgL3UxfEdAWqfWORiftKySHDAAdoUoIp4ZBAE-2N-WunaQqkiSOOmfY3XsvwT30i3F05MbFFcS0Ro9Nacd_jdkjlLnNPwpdoN6fWfIlgViSI1YF8OIzmYU_BTM3Z50T7BRjagFk0stwxVQMKZiM_uk01KE"
              />
              <img
                alt="Housekeeper"
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full border-2 border-primary object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_Rch8tEGlShqyeT_YdzpEaEltle0yE8Yoa0rSvQn5U2_5YI0-gGHadDAUGGgYHbWwzUxM3thPidc7TW0C5h1cvQh9A-vm9oQkk4Ee72sYd4lv6JWDkxpAjhGIortcfNZUxGadIo6ohPOJbd9KgyiFmXCW_lGwlud6d5__kD7sU5Bu7_hkroL093iFk5HFOFp6SLd5NPzo_-xY0mG1pxBTWBtzgeNXDVBhB6FuE1GrIIY33NAVGlaBvytsTgUBbXiLk4paJ_atVTw"
              />
              <div className="w-8 h-8 rounded-full border-2 border-primary bg-surface-container-highest text-primary flex items-center justify-center font-bold text-xs">
                +4
              </div>
            </div>
            <button
              onClick={() => alert("Cleaning assignments configured for 6 housekeepers on duty.")}
              className="bg-white text-primary px-3.5 py-1.5 rounded-default font-semibold text-[11px] tracking-wider uppercase hover:bg-opacity-90 transition-all cursor-pointer"
            >
              Assign Tasks
            </button>
          </div>
        </div>
      </section>

      {/* Room Selection Details Sheet Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bg-surface-container-lowest w-full md:max-w-md rounded-t-lg md:rounded-lg overflow-hidden shadow-2xl"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="font-display text-xl font-extrabold text-primary">
                    Room {selectedRoom.id}
                  </h2>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    {selectedRoom.type} • {selectedRoom.floor}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Configuration Settings */}
              <div className="space-y-3 mb-5 p-3.5 bg-[#fbfbfb] border border-zinc-200 rounded-xl">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">
                  Configure Room Properties
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9.5px] font-bold text-zinc-500 uppercase mb-1">
                      Room No / ID
                    </label>
                    <input
                      type="text"
                      value={draftId}
                      onChange={(e) => setDraftId(e.target.value)}
                      placeholder="e.g. 101"
                      className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-bold text-zinc-500 uppercase mb-1">
                      Layout / Type
                    </label>
                    <input
                      type="text"
                      value={draftType}
                      onChange={(e) => setDraftType(e.target.value)}
                      placeholder="e.g. Deluxe King"
                      className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9.5px] font-bold text-zinc-500 uppercase mb-1">
                    Floor Location
                  </label>
                  <select
                    value={draftFloor}
                    onChange={(e) => setDraftFloor(e.target.value as any)}
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="1st Floor">1st Floor</option>
                    <option value="2nd Floor">2nd Floor</option>
                    <option value="3rd Floor">3rd Floor</option>
                    <option value="Penthouse">Penthouse</option>
                  </select>
                </div>
              </div>

              {/* Status Picker Selector buttons */}
              <div className="mb-6">
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  Room Operational Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDraftStatus('Vacant')}
                    className={`p-3 rounded-lg border text-xs font-bold flex items-center gap-2 justify-center cursor-pointer transition-all ${
                      draftStatus === 'Vacant'
                        ? 'border-green-600 bg-green-50 text-green-800'
                        : 'border-outline-variant hover:border-[#aaa]'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> VACANT
                  </button>

                  <button
                    onClick={() => setDraftStatus('Dirty')}
                    className={`p-3 rounded-lg border text-xs font-bold flex items-center gap-2 justify-center cursor-pointer transition-all ${
                      draftStatus === 'Dirty'
                        ? 'border-amber-600 bg-amber-50 text-amber-800'
                        : 'border-outline-variant hover:border-[#aaa]'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> DIRTY
                  </button>

                  <button
                    onClick={() => setDraftStatus('Occupied')}
                    className={`p-3 rounded-lg border text-xs font-bold flex items-center gap-2 justify-center cursor-pointer transition-all ${
                      draftStatus === 'Occupied'
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-outline-variant hover:border-[#aaa]'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> OCCUPIED
                  </button>

                  <button
                    onClick={() => setDraftStatus('Out of Order')}
                    className={`p-3 rounded-lg border text-xs font-bold flex items-center gap-2 justify-center cursor-pointer transition-all ${
                      draftStatus === 'Out of Order'
                        ? 'border-red-600 bg-red-50 text-red-800'
                        : 'border-outline-variant hover:border-[#aaa]'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> OUT OF ORDER
                  </button>
                </div>
              </div>

              {/* Sub status helper configuration (for high priority cleans, etc) */}
              {draftStatus === 'Occupied' && (
                <div className="mb-4">
                  <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                    Guest Condition Tags
                  </label>
                  <div className="flex gap-2">
                    {['PRIVACY', 'SERVICE REQ', 'STAYOVER'].map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setDraftSubStatus(tag)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer border ${
                          draftSubStatus === tag
                            ? 'bg-primary text-on-primary border-primary'
                            : 'bg-white border-outline-variant'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Housekeeping Instructions notes text-field */}
              <div className="mb-6">
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  Housekeeping & Desk Notes
                </label>
                <textarea
                  className="w-full bg-surface-container-low border border-[#eae8e4] rounded-lg p-3 text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-outline"
                  placeholder="Insert custom housekeeping instructions or front desk details for this room..."
                  rows={4}
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                />
              </div>

              {/* Clean Room Verification Proof Media */}
              {(selectedRoom.cleanPhoto || selectedRoom.cleanVideo) && (
                <div className="mb-6 p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-3">
                  <div className="flex items-center gap-1.5 text-emerald-800">
                    <span className="material-symbols-outlined text-base font-bold">verified</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Room Clean Verification Proof
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedRoom.cleanPhoto && (
                      <div className="relative group rounded-lg overflow-hidden bg-black border border-zinc-200 aspect-video">
                        <img
                          src={selectedRoom.cleanPhoto}
                          alt="Clean Room proof"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <a
                          href={selectedRoom.cleanPhoto}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white font-bold"
                        >
                          View Photo
                        </a>
                      </div>
                    )}
                    {selectedRoom.cleanVideo && (
                      <div className="relative group rounded-lg overflow-hidden bg-black border border-zinc-200 aspect-video">
                        <video
                          src={selectedRoom.cleanVideo}
                          controls
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div className="text-[9px] text-zinc-500 font-medium flex justify-between">
                    <span>Submitted by: <strong>{selectedRoom.cleanSubmittedBy || 'Housekeeper'}</strong></span>
                    <span>Time: <strong>{selectedRoom.cleanSubmittedTime || 'N/A'}</strong></span>
                  </div>
                </div>
              )}

              {/* Final submission triggers */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="w-full bg-primary text-on-primary py-3.5 rounded-lg font-bold text-sm shadow-md hover:bg-black/90 active:scale-95 transition-all cursor-pointer"
                >
                  {isSaving ? 'Updating Room Data...' : 'Update Room State'}
                </button>

                <button
                  onClick={() => handleDeleteRoom(selectedRoom.id)}
                  type="button"
                  className="w-full bg-red-50 text-red-700 hover:bg-red-100 py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-red-200 flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  Delete Room
                </button>

                <button
                  onClick={() => {
                    alert(`Front Desk notified about Room ${selectedRoom.id} layout status.`);
                  }}
                  className="w-full bg-transparent text-on-surface-variant font-bold text-xs py-2 rounded-lg hover:bg-surface-container-low transition-all cursor-pointer"
                >
                  Notify Front Desk Managers
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Room Modal */}
      {isAddingRoom && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bg-surface-container-lowest w-full md:max-w-md rounded-t-lg md:rounded-lg overflow-hidden shadow-2xl animate-fade-in"
          >
            <form onSubmit={handleCreateRoom} className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="font-display text-xl font-extrabold text-primary">
                    Add New Room
                  </h2>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    Configure custom ID and details
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingRoom(false)}
                  className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Room Number / ID / Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoomId}
                    onChange={(e) => setNewRoomId(e.target.value)}
                    placeholder="E.g. 101, Executive Penthouse, Suite A"
                    className="w-full bg-surface-container-low border border-[#eae8e4] rounded-lg px-3 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-outline"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Room Type & Layout
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoomType}
                    onChange={(e) => setNewRoomType(e.target.value)}
                    placeholder="E.g. Deluxe King, Standard Suite, Twin Bed"
                    className="w-full bg-surface-container-low border border-[#eae8e4] rounded-lg px-3 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-outline"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                      Floor Location
                    </label>
                    <select
                      value={newRoomFloor}
                      onChange={(e) => setNewRoomFloor(e.target.value as any)}
                      className="w-full bg-surface-container-low border border-[#eae8e4] rounded-lg px-3 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                    >
                      <option value="1st Floor">1st Floor</option>
                      <option value="2nd Floor">2nd Floor</option>
                      <option value="3rd Floor">3rd Floor</option>
                      <option value="Penthouse">Penthouse</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                      Operational Status
                    </label>
                    <select
                      value={newRoomStatus}
                      onChange={(e) => setNewRoomStatus(e.target.value as any)}
                      className="w-full bg-surface-container-low border border-[#eae8e4] rounded-lg px-3 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                    >
                      <option value="Vacant">Vacant</option>
                      <option value="Dirty">Dirty</option>
                      <option value="Occupied">Occupied</option>
                      <option value="Out of Order">Out of Order</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Special Features & Notes
                  </label>
                  <textarea
                    value={newRoomNotes}
                    onChange={(e) => setNewRoomNotes(e.target.value)}
                    placeholder="E.g. Hot tub balcony, garden view, extra slippers request"
                    className="w-full bg-surface-container-low border border-[#eae8e4] rounded-lg p-3 text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-outline"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddingRoom(false)}
                  className="flex-1 bg-surface-container-low text-on-surface py-3.5 rounded-lg font-bold text-sm hover:bg-surface-container transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary text-on-primary py-3.5 rounded-lg font-bold text-sm shadow-md hover:bg-black/90 active:scale-95 transition-all cursor-pointer"
                >
                  Create Room
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
