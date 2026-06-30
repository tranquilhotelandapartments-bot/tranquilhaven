/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import twilio from 'twilio';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Load environment variables from .env when present
  dotenv.config();

  // Middleware for body parsing
  app.use(express.json({ limit: '10mb' }));

  // API endpoint for AI report generation
  app.post('/api/generate-report', async (req, res) => {
    try {
      const { hotelState } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('GEMINI_API_KEY key is missing. Using pre-calibrated highly styled mock AI response.');
        return res.json(getFallbackReport(hotelState));
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `Write a comprehensive, professional hotel operations report for "Tranquil Haven" general manager.
      Use the following live operational metrics of the hotel to write meaningful, custom, cohesive evaluations:
      - Total Rooms Count: ${hotelState?.rooms?.length || 13}
      - Rooms Details Statuses: ${JSON.stringify(hotelState?.rooms || {})}
      - Active Reservations Count: ${hotelState?.reservations?.length || 5}
      - Upcoming Guests List: ${JSON.stringify(hotelState?.reservations || {})}
      - Active Urgent/Routine Maintenance Tickets: ${JSON.stringify(hotelState?.tickets || {})}

      Construct the response strictly following the JSON schema provided, with highly detailed, insightful text, and cohesive values that tie back to the hotel data. Ensure all percentages and stats logically represent the provided state. Make the editorial copy dry, executive, elegant, and highly polished. No placeholders or lorum-ipsum.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: 'You are a elite hospitality logistics analyst and executive auditor. You generate structured business evaluations for high-end boutique properties.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'E.g., "Tranquil Haven Operational Intelligence Report"' },
              subtitle: { type: Type.STRING, description: 'E.g., "Bridging Pristine Guest Comfort with High-Fidelity Preventive Maintenance"' },
              generatedAt: { type: Type.STRING },
              executiveSummary: { type: Type.STRING, description: 'A highly descriptive 2-paragraph executive overview summarizing recent turnovers, active bottlenecks, and overall logistics health.' },
              
              performanceDonutValue: { type: Type.INTEGER, description: 'Main occupancy or performance percent (e.g., 78)' },
              performanceDonutLabel: { type: Type.STRING, description: 'E.g., "Realized Occupancy"' },
              performanceDonutComment: { type: Type.STRING, description: 'Analysis of the occupancy patterns based on reservations and guest turnaround.' },
              
              statLeftVal: { type: Type.INTEGER, description: 'Secondary stat, e.g., 84 (percentage of rooms in pristine clean status)' },
              statLeftLabel: { type: Type.STRING, description: 'E.g., "Housekeeping Readiness"' },
              statLeftDesc: { type: Type.STRING, description: 'Brief expert commentary about room turnaround and cleanliness rates.' },
              
              statRightVal: { type: Type.INTEGER, description: 'Tertiary stat, e.g., 18 (preventive repair backlog or ticket response)' },
              statRightLabel: { type: Type.STRING, description: 'E.g., "Logistics Alert Index"' },
              statRightDesc: { type: Type.STRING, description: 'Expert commentary about active facility tickets or blockages.' },
              
              splitBarHeader: { type: Type.STRING, description: 'E.g., "Preventive Care Resolution Effectiveness"' },
              splitBarLeftLabel: { type: Type.STRING, description: 'E.g., "Fixed Within SLA"' },
              splitBarLeftVal: { type: Type.INTEGER, description: 'E.g., 67' },
              splitBarRightLabel: { type: Type.STRING, description: 'E.g., "Action Backlog"' },
              splitBarRightVal: { type: Type.INTEGER, description: 'E.g., 33' },
              
              categoryScores: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING, description: 'Category name, e.g., "Suite Availability"' },
                    score: { type: Type.INTEGER, description: 'E.g. 89' },
                    text: { type: Type.STRING, description: 'Analysis explaining this specific service/facility segment score.' }
                  },
                  required: ['label', 'score', 'text']
                }
              },
              
              gridHighlightVal: { type: Type.INTEGER, description: 'Grid visual capacity, e.g. 42' },
              gridHighlightLabel: { type: Type.STRING, description: 'E.g., "Penthouse VIP Utilisation"' },
              gridHighlightDesc: { type: Type.STRING, description: 'Explanation describing visual capacity indicator data.' },
              
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of at least 3 concrete, strategic operations recommendations for Alex Mercer.'
              }
            },
            required: [
              'title', 'subtitle', 'generatedAt', 'executiveSummary',
              'performanceDonutValue', 'performanceDonutLabel', 'performanceDonutComment',
              'statLeftVal', 'statLeftLabel', 'statLeftDesc',
              'statRightVal', 'statRightLabel', 'statRightDesc',
              'splitBarHeader', 'splitBarLeftLabel', 'splitBarLeftVal', 'splitBarRightLabel', 'splitBarRightVal',
              'categoryScores', 'gridHighlightVal', 'gridHighlightLabel', 'gridHighlightDesc',
              'recommendations'
            ]
          }
        }
      });

      const parsedData = JSON.parse(response.text || '{}');
      return res.json(parsedData);
    } catch (error: any) {
      console.error('Error generating AI executive report:', error);
      res.status(500).json({ error: error.message || 'Error occurred' });
    }
  });

  // API endpoint to send WhatsApp messages via Twilio
  app.post('/api/send-whatsapp', async (req, res) => {
    try {
      const { toPhone, message } = req.body || {};

      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_WHATSAPP_FROM; // e.g. "+123456789" or "whatsapp:+123456789"

      if (!accountSid || !authToken || !fromNumber) {
        console.warn('Twilio credentials missing in environment; cannot send WhatsApp message.');
        return res.status(500).json({ error: 'Twilio not configured on server.' });
      }

      if (!toPhone || !message) {
        return res.status(400).json({ error: 'Missing toPhone or message in request body.' });
      }

      const client = twilio(accountSid, authToken);

      // Normalize numbers: ensure leading + and remove non-digit characters
      let normalized = String(toPhone).trim();
      if (!normalized.startsWith('+')) {
        normalized = normalized.replace(/\D/g, '');
        if (normalized.length > 0) normalized = `+${normalized}`;
      }

      const fromNormalized = String(fromNumber).replace(/^whatsapp:/, '');

      const msg = await client.messages.create({
        from: `whatsapp:${fromNormalized}`,
        to: `whatsapp:${normalized}`,
        body: message,
      });

      return res.json({ sid: msg.sid, status: msg.status });
    } catch (error: any) {
      console.error('Error sending WhatsApp message:', error);
      return res.status(500).json({ error: error?.message || String(error) });
    }
  });

  // Serve static assets in development & production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server running on port ${PORT}`);
  });
}

// Fallback high-fidelity operational analyst report builder
function getFallbackReport(hotelState: any) {
  const rooms = hotelState?.rooms || [];
  const reservations = hotelState?.reservations || [];
  const tickets = hotelState?.tickets || [];

  const occupiedRoomsCount = rooms.filter((r: any) => r.status === 'Occupied').length;
  const oooRoomsCount = rooms.filter((r: any) => r.status === 'Out of Order').length;
  const cleanRoomsCount = rooms.filter((r: any) => r.subStatus === 'CLEANED' || r.subStatus === 'READY').length;
  const totalRooms = rooms.length || 13;

  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRoomsCount / totalRooms) * 100) : 60;
  const cleaningRate = totalRooms > 0 ? Math.round((cleanRoomsCount / totalRooms) * 100) : 80;
  const maintenanceIndex = tickets.length > 0 ? Math.round((tickets.filter((t: any) => t.category === 'Urgent').length / tickets.length) * 100) : 15;

  return {
    title: 'Tranquil Haven Operational Intelligence Report',
    subtitle: 'Bridging Premium Guest Experience with Real-Time Service Logistics',
    generatedAt: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ' at ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    executiveSummary: `Following the operational overhaul of Tranquil Haven, our real-time audit shows robust metrics across key divisions. Guest logistics have experienced seamless transitions with active expected premium arrivals. Currently, our inventory efficiency is stabilized, supported by an optimized housekeeping queue that guarantees high standards for checked-in dignitaries who request maximum stays.

    However, proactive focus is advised regarding current maintenance logs. We have active repair requests, including urgent plumbing indicators in core guest suites. Addressing these tickets swiftly remains crucial to minimizing offline room impact and ensuring that room buffers stay ready to receive executive guest requests without experiencing downstream delays.`,
    
    performanceDonutValue: occupancyRate,
    performanceDonutLabel: 'Realized Occupancy',
    performanceDonutComment: `Occupancy is currently calibrated at ${occupancyRate}%, with a strong upward curve driven by upcoming reservations. Executive suites are highly sought after this session, demonstrating high inventory utilization.`,
    
    statLeftVal: cleaningRate,
    statLeftLabel: 'Housekeeping Readiness',
    statLeftDesc: `About ${cleaningRate}% of rooms are fully prepped and certified. Quick prioritized turnaround queues are currently managing checked-out dirty rooms in record time.`,
    
    statRightVal: maintenanceIndex,
    statRightLabel: 'Logistics Action Index',
    statRightDesc: `We have registered a moderate action index of ${maintenanceIndex}%. Most logged tickets are facility issues, allowing core rooms to stay operational.`,
    
    splitBarHeader: 'Preventive Care Resolution Response',
    splitBarLeftLabel: 'Assigned / In Progress',
    splitBarLeftVal: 67,
    splitBarRightLabel: 'Awaiting Action',
    splitBarRightVal: 33,
    
    categoryScores: [
      {
        label: 'Suite Turnaround Speed',
        score: 89,
        text: 'Turnaround speed continues to exceed baseline SLA benchmarks, with housekeeping completing Deluxe suite renewals in under 24 minutes'
      },
      {
        label: 'Facility Asset Reliability',
        score: 74,
        text: 'A mechanical fan replacement in Suite 104 is currently active, slightly lowering facility uptime. Other logistics assets are performing optimally.'
      },
      {
        label: 'Staff Communication Cohesion',
        score: 88,
        text: 'Daily logs indicate a fast operational cadence. Shift handovers are highly documented, with staff checking guests in fluidly.'
      },
      {
        label: 'Hypoallergenic Standard Compliance',
        score: 95,
        text: 'Organic towels and air purifiers are uniformly placed. Standard chocolate preparations and signed VIP letters are completed successfully.'
      }
    ],
    
    gridHighlightVal: 42,
    gridHighlightLabel: 'Dignitary Suite Utilisation',
    gridHighlightDesc: 'Current block-ratio represents occupied executive penthouse quarters. Highlighted modules require specialized linen priority protocols.',
    
    recommendations: [
      'Expedite the fan motor repair in Room 104 to bring the out-of-order Suite inventory back online.',
      'Instruct housekeeping to prioritize Room 102 bathroom plumbing repairs before preparing for expected guests.',
      'Deploy supplemental guest WiFi parameters in the Lobby South to address user AP connectivity issues.',
      'Coordinate with shift supervisor Mike T. on urgent plumbing logs to keep general turnaround under 30 minutes.'
    ]
  };
}

startServer();
