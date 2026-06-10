import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import { Shell } from "@/components/Shell";
import { saveProfile } from "@/lib/auth";
import { useStore } from "@/lib/store";

const COUNTRIES = [
  { value: "NG", label: "Nigeria" },
  { value: "GH", label: "Ghana" },
  { value: "KE", label: "Kenya" },
  { value: "ZA", label: "South Africa" },
  { value: "EG", label: "Egypt" },
  { value: "ET", label: "Ethiopia" },
  { value: "SN", label: "Senegal" },
  { value: "CI", label: "Côte d'Ivoire" },
  { value: "CM", label: "Cameroon" },
  { value: "TZ", label: "Tanzania" },
  { value: "UG", label: "Uganda" },
  { value: "RW", label: "Rwanda" },
  { value: "GB", label: "United Kingdom" },
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "NL", label: "Netherlands" },
  { value: "OTHER", label: "Other" },
];

const NG_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa",
  "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo",
  "Ekiti", "Enugu", "FCT – Abuja", "Gombe", "Imo", "Jigawa",
  "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

const GH_REGIONS = [
  "Greater Accra", "Ashanti", "Eastern", "Western", "Northern",
  "Upper East", "Upper West", "Volta", "Central", "Bono",
  "Bono East", "Ahafo", "Savannah", "North East", "Oti", "Western North",
];

const KE_COUNTIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika",
  "Kiambu", "Machakos", "Meru", "Kilifi", "Other",
];

function getStates(country: string): string[] {
  if (country === "NG") return NG_STATES;
  if (country === "GH") return GH_REGIONS;
  if (country === "KE") return KE_COUNTIES;
  return [];
}

export function Region() {
  const navigate       = useNavigate();
  const [state, set]   = useStore();
  const [country, setCountry]     = useState(state.country ?? "");
  const [regionState, setRegionState] = useState(state.regionState ?? "");
  const [saving, setSaving]       = useState(false);

  const stateOptions = country ? getStates(country) : [];
  const needsState   = stateOptions.length > 0;

  const canContinue = country.length > 0 && (!needsState || regionState.length > 0);

  const proceed = async (skip = false) => {
    if (saving) return;
    setSaving(true);

    const chosenCountry = skip ? null : country || null;
    const chosenState   = skip ? null : regionState || null;

    set({ country: chosenCountry, regionState: chosenState });

    // Fire-and-forget: save to profile. Never blocks auth flow.
    if (!skip && state.token && chosenCountry) {
      saveProfile(state.token, {
        country:      chosenCountry,
        region_state: chosenState ?? undefined,
      }).catch(() => null);
    }

    navigate("/success");
  };

  return (
    <Shell step={4}>
      <div className="screen-enter" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Icon */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, marginTop: 8 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: "var(--gold-dim)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}>
            <MapPin size={24} color="var(--gold)" />
          </div>
          <div>
            <h1 style={{ fontSize: "clamp(20px, 5vw, 24px)" }}>
              Almost there
              {state.username ? <>,{" "}<span className="text-green">@{state.username}</span></> : null}
            </h1>
          </div>
        </div>

        <p className="text-muted text-sm" style={{ lineHeight: 1.7, marginBottom: 28 }}>
          Tell us where you are to discover your regional community, local rooms, and creators near you.
        </p>

        {/* Country */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="country-select" className="text-sm" style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>
            Country
          </label>
          <div className="select-wrap">
            <select
              id="country-select"
              className="rald-select"
              value={country}
              onChange={e => { setCountry(e.target.value); setRegionState(""); }}
            >
              <option value="">Select your country…</option>
              {COUNTRIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* State / Region — only for supported countries */}
        {needsState && (
          <div className="animate-in" style={{ marginBottom: 16 }}>
            <label htmlFor="state-select" className="text-sm" style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>
              {country === "NG" ? "State" : country === "GH" ? "Region" : "County / Province"}
            </label>
            <div className="select-wrap">
              <select
                id="state-select"
                className="rald-select"
                value={regionState}
                onChange={e => setRegionState(e.target.value)}
              >
                <option value="">
                  Select{country === "NG" ? " state" : country === "GH" ? " region" : "…"}
                </option>
                {stateOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <p className="text-xs text-muted mt-2" style={{ lineHeight: 1.6 }}>
          Used only for discovery, regional rooms, and local content. Never shared with third parties.
        </p>

        <div className="mt-auto" style={{ paddingTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canContinue || saving}
            onClick={() => proceed(false)}
          >
            {saving ? <><span className="spinner" /> Saving…</> : <>Continue <ArrowRight size={18} /></>}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ color: "var(--muted)", fontSize: 14 }}
            disabled={saving}
            onClick={() => proceed(true)}
          >
            Skip for now
          </button>
        </div>
      </div>
    </Shell>
  );
}
