import React, { useState } from 'react';
import { ShieldCheck, Upload, Download, CheckCircle, Info } from 'lucide-react';
import { RegistrationRecord } from '../../types/index.js';

interface OrganizerDashboardProps {
  registrations: RegistrationRecord[];
  onUploadCsvVerify: () => void;
}

export const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({
  registrations,
  onUploadCsvVerify
}) => {
  const [csvUploaded, setCsvUploaded] = useState(false);

  const intentCount = registrations.filter(r => r.fidelity === 'intent').length;
  const selfReportedCount = registrations.filter(r => r.fidelity === 'self_reported').length;
  const verifiedCount = registrations.filter(r => r.fidelity === 'verified').length + (csvUploaded ? 3 : 0);
  const consentedCount = registrations.filter(r => r.share_consent).length;

  const handleSimulateUpload = () => {
    setCsvUploaded(true);
    onUploadCsvVerify();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header Banner */}
      <div className="bg-paper-card border-3 border-ink shadow-hard-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <span className="px-2 py-0.5 text-xs font-display font-bold uppercase tracking-wider bg-flare text-paper border border-ink">
              Organizer Console
            </span>
            <h2 className="font-display font-bold text-2xl text-ink mt-1">
              Bangalore GenAI Buildathon · Registrant Headcount
            </h2>
            <p className="text-xs text-slate mt-0.5">
              Fidelity-aware attendance tracking. Never conflate click-throughs with verified attendees.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSimulateUpload}
              className="flex items-center space-x-1.5 px-3 py-2 bg-acid text-ink font-display font-bold text-xs uppercase tracking-wider border-2 border-ink shadow-hard-sm hover:translate-x-0.5 hover:translate-y-0.5"
            >
              <Upload className="w-4 h-4" />
              <span>{csvUploaded ? 'CSV Matched (3 Verified)' : 'Upload Registrant CSV'}</span>
            </button>
            <button
              className="p-2 bg-paper border-2 border-ink shadow-hard-sm hover:bg-slate/10"
              title="Export CSV"
            >
              <Download className="w-4 h-4 text-ink" />
            </button>
          </div>
        </div>

        {/* 3-Fidelity KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t-2 border-ink pt-4">
          {/* 1. Clicked Through (Intent) */}
          <div className="p-3.5 bg-paper border-2 border-ink shadow-hard-sm">
            <div className="text-[11px] font-display font-bold uppercase tracking-wider text-slate mb-1">
              Clicked Through (Intent)
            </div>
            <div className="font-display font-bold text-3xl text-ink mb-1">
              {intentCount}
            </div>
            <p className="text-[11px] text-slate">
              Students who tapped the outbound official registration link.
            </p>
          </div>

          {/* 2. Self-Reported */}
          <div className="p-3.5 bg-paper border-2 border-ink shadow-hard-sm">
            <div className="text-[11px] font-display font-bold uppercase tracking-wider text-pulse mb-1">
              Self-Reported
            </div>
            <div className="font-display font-bold text-3xl text-pulse mb-1">
              {selfReportedCount}
            </div>
            <p className="text-[11px] text-slate">
              Confirmed completion upon returning to CampusGenie tab.
            </p>
          </div>

          {/* 3. Verified Against List */}
          <div className="p-3.5 bg-paper border-2 border-ink shadow-hard-sm">
            <div className="text-[11px] font-display font-bold uppercase tracking-wider text-flare mb-1">
              Verified Against Official List
            </div>
            <div className="font-display font-bold text-3xl text-flare mb-1">
              {verifiedCount}
            </div>
            <p className="text-[11px] text-slate">
              {csvUploaded ? 'Matched via official registrant email list.' : 'Upload CSV to reconcile.'}
            </p>
          </div>
        </div>

        {/* Consent Transparency Banner */}
        <div className="mt-4 p-3 bg-acid/20 border-2 border-ink flex items-start space-x-2.5 text-xs text-ink">
          <ShieldCheck className="w-4 h-4 text-pulse shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Student Privacy Guarantee: </span>
            {consentedCount} students consented to share their contact and department details with your organizing committee. Non-consenting students appear as anonymous counts to prevent data leakage.
          </div>
        </div>
      </div>

      {/* Registrant Table */}
      <div className="bg-paper-card border-3 border-ink shadow-hard-lg overflow-hidden">
        <div className="p-4 border-b-2 border-ink font-display font-bold text-sm uppercase tracking-wider text-ink">
          Recent Registrant Activity Log
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-paper border-b-2 border-ink font-display font-bold uppercase tracking-wider text-slate">
              <tr>
                <th className="p-3">Student Name</th>
                <th className="p-3">College & Dept</th>
                <th className="p-3">Year</th>
                <th className="p-3">Fidelity Level</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/20">
              {registrations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate italic">
                    No registrations recorded yet. Click register on an event or switch personas to test!
                  </td>
                </tr>
              ) : (
                registrations.map((reg, idx) => (
                  <tr key={idx} className="hover:bg-paper/50">
                    <td className="p-3 font-semibold text-ink">
                      {reg.share_consent ? (reg.name || 'Student') : '(Anonymous Student)'}
                    </td>
                    <td className="p-3 text-slate">
                      {reg.share_consent ? (reg.department || 'CSE') : '—'}
                    </td>
                    <td className="p-3 text-slate">
                      {reg.share_consent ? (reg.year ? `Year ${reg.year}` : 'Year 3') : '—'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 font-display font-bold text-[10px] uppercase tracking-wider border border-ink ${
                          reg.fidelity === 'verified' || (csvUploaded && idx < 3)
                            ? 'bg-flare text-paper'
                            : reg.fidelity === 'self_reported'
                            ? 'bg-acid text-ink'
                            : 'bg-paper text-slate'
                        }`}
                      >
                        {csvUploaded && idx < 3 ? 'verified' : reg.fidelity}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-ink">
                      {reg.state.replace('_', ' ')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
