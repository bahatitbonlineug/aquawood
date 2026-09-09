import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Leaf, Camera, Upload, Loader2, AlertTriangle, CheckCircle2,
  FlaskConical, MapPin, Stethoscope, History, X, RefreshCw,
  ChevronDown, ChevronUp, Microscope
} from 'lucide-react';
import moment from 'moment';
import ReactMarkdown from 'react-markdown';

const severityConfig = {
  healthy: { label: 'Healthy', cls: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle2 },
  mild: { label: 'Mild', cls: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: AlertTriangle },
  moderate: { label: 'Moderate', cls: 'bg-orange-100 text-orange-700 border-orange-300', icon: AlertTriangle },
  severe: { label: 'Severe', cls: 'bg-red-100 text-red-700 border-red-300', icon: AlertTriangle },
  critical: { label: 'Critical', cls: 'bg-red-200 text-red-800 border-red-400', icon: AlertTriangle },
};

const urgencyConfig = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function PlantDoctor() {
  const [tab, setTab] = useState('scan');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false); // kept for future use
  const [gps, setGps] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setResult(null);
  };

  const captureGPS = () => {
    setGpsLoading(true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { timeout: 8000 }
    );
  };

  const analyze = async () => {
    if (!imageFile) return;
    setAnalyzing(true);
    setResult(null);
    setAnalyzeError(null);

    // 1. Upload image
    const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });

    // 2. Get GPS location name if available
    let locationAddress = '';
    if (gps) {
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${gps.lat}&lon=${gps.lng}&format=json`);
        const geoData = await geoRes.json();
        locationAddress = geoData.display_name || '';
      } catch (_) {}
    }

    // 3. AI Vision analysis — use gpt_5_4 which supports both vision + JSON schema
    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are AQUA WOOD Plant Doctor AI — an expert plant pathologist specializing in East African tropical plants, especially Uganda's agricultural and forest crops.

Carefully analyze this plant leaf/plant image and provide a complete diagnosis.

${gps ? `GPS Location: ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)} ${locationAddress ? '— ' + locationAddress : ''}` : ''}

Provide your full diagnosis including:
1. Plant identification (common name + scientific name)
2. Disease/condition detected (be specific)
3. Severity assessment (healthy/mild/moderate/severe/critical)
4. Visible symptoms you observe (list)
5. LOCAL TREATMENT in Luganda — traditional remedies using neem leaves (omuziru), wood ash (vu), cow dung, banana leaves, etc.
6. LOCAL TREATMENT in English — same content translated
7. SCIENTIFIC TREATMENT — specific fungicides/pesticides with dosage
8. Prevention tips (at least 3)
9. WHERE TO GET HELP in Luganda — e.g. "Teera mu duka lya byobulamu bw'ebirime" or "Saba omulabirizi w'ebirime mu disitulikiti yo"
10. WHERE TO GET HELP in English — agro-input dealers, district extension offices, NARO/NaCRRI offices
11. Urgency level (low/medium/high/urgent)
12. Confidence percentage (0-100)

If the plant looks healthy, say so clearly. Be culturally sensitive and practical for Ugandan farmers.`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          plant_name: { type: 'string' },
          scientific_name: { type: 'string' },
          disease_name: { type: 'string' },
          disease_description: { type: 'string' },
          severity: { type: 'string', enum: ['healthy', 'mild', 'moderate', 'severe', 'critical'] },
          confidence_pct: { type: 'number' },
          symptoms: { type: 'array', items: { type: 'string' } },
          local_treatment_luganda: { type: 'string' },
          local_treatment_english: { type: 'string' },
          scientific_treatment: { type: 'string' },
          prevention_tips: { type: 'array', items: { type: 'string' } },
          location_suggestion_luganda: { type: 'string' },
          location_suggestion_english: { type: 'string' },
          urgency: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        }
      }
    });

    // 4. Save to database
    const saved = await base44.entities.PlantDiagnosis.create({
      image_url: file_url,
      plant_name: `${aiResult.plant_name}${aiResult.scientific_name ? ' (' + aiResult.scientific_name + ')' : ''}`,
      disease_name: aiResult.disease_name,
      disease_description: aiResult.disease_description,
      severity: aiResult.severity,
      confidence_pct: aiResult.confidence_pct,
      symptoms: aiResult.symptoms || [],
      local_treatment: `🇺🇬 Luganda:\n${aiResult.local_treatment_luganda}\n\n🇬🇧 English:\n${aiResult.local_treatment_english}`,
      scientific_treatment: aiResult.scientific_treatment,
      prevention_tips: aiResult.prevention_tips || [],
      location_suggestion: `🇺🇬 ${aiResult.location_suggestion_luganda}\n\n📍 ${aiResult.location_suggestion_english}`,
      urgency: aiResult.urgency,
      location: gps ? { lat: gps.lat, lng: gps.lng, address: locationAddress } : undefined,
    });

    // Refresh history so new scan appears immediately
    setHistoryLoaded(false);

    setResult({ ...saved });
    setAnalyzing(false);
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    const data = await base44.entities.PlantDiagnosis.list('-created_date', 50);
    setHistory(data);
    setHistoryLoading(false);
    setHistoryLoaded(true);
  };

  const reset = () => {
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setGps(null);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-700 to-emerald-500 p-6 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=1200')] bg-cover bg-center opacity-10" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <Stethoscope className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Plant Doctor 🌿</h1>
            <p className="text-white/80 text-sm mt-1">
              Scan any plant leaf · AI diagnoses disease · Local & scientific treatment · Location help in Luganda
            </p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v); if (v === 'history') loadHistory(); }}>
        <TabsList className="grid grid-cols-2 w-full max-w-xs">
          <TabsTrigger value="scan" className="gap-2"><Leaf className="h-4 w-4" /> Scan Plant</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> History</TabsTrigger>
        </TabsList>

        {/* ── SCAN TAB ── */}
        <TabsContent value="scan" className="space-y-4 mt-4">
          {!result ? (
            <>
              {/* Image capture area */}
              <Card className="border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors">
                <CardContent className="p-6">
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Plant" className="w-full max-h-80 object-contain rounded-xl" />
                      <button onClick={reset}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8 space-y-4">
                      <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                        <Leaf className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">Upload a plant leaf photo</p>
                        <p className="text-muted-foreground text-sm mt-1">Take a clear photo of the affected leaves for best results</p>
                      </div>
                      <div className="flex gap-3 justify-center">
                        <Button variant="outline" className="gap-2" onClick={() => cameraInputRef.current?.click()}>
                          <Camera className="h-4 w-4" /> Take Photo
                        </Button>
                        <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                          <Upload className="h-4 w-4" /> Upload Image
                        </Button>
                      </div>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
                </CardContent>
              </Card>

              {/* GPS */}
              {imagePreview && (
                <Card>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Add GPS Location</p>
                        <p className="text-xs text-muted-foreground">
                          {gps ? `📍 ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : 'Optional — helps suggest nearby treatment centers'}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant={gps ? 'secondary' : 'outline'} onClick={captureGPS} disabled={gpsLoading}>
                      {gpsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : gps ? '✓ GPS Added' : 'Get Location'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Error message */}
              {analyzeError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div><strong>Analysis failed:</strong> {analyzeError}</div>
                </div>
              )}

              {/* Analyze button */}
              {imagePreview && (
                <Button className="w-full gap-2 h-12 text-base" onClick={analyze} disabled={analyzing}>
                  {analyzing ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Analysing plant... this may take 15–30 seconds</>
                  ) : (
                    <><Microscope className="h-5 w-5" /> Diagnose Plant</>
                  )}
                </Button>
              )}
            </>
          ) : (
            <DiagnosisResult result={result} onReset={reset} />
          )}
        </TabsContent>

        {/* ── HISTORY TAB ── */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" /> Past Diagnoses
                <Badge variant="secondary">{history.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Leaf className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No diagnoses yet. Scan your first plant!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => {
                    const sev = severityConfig[item.severity] || severityConfig.mild;
                    const isOpen = expandedHistory === item.id;
                    return (
                      <div key={item.id} className="border border-border rounded-xl overflow-hidden">
                        <button
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors text-left"
                          onClick={() => setExpandedHistory(isOpen ? null : item.id)}
                        >
                          {item.image_url && (
                            <img src={item.image_url} alt="" className="h-14 w-14 object-cover rounded-lg shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{item.plant_name || 'Unknown Plant'}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.disease_name || 'No disease detected'}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{moment(item.created_date).fromNow()}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${sev.cls}`}>{sev.label}</span>
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </button>
                        {isOpen && <HistoryDetail item={item} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Diagnosis Result Component ────────────────────────────────────────────────

function DiagnosisResult({ result, onReset }) {
  const sev = severityConfig[result.severity] || severityConfig.mild;
  const SevIcon = sev.icon;

  return (
    <div className="space-y-4">
      {/* Plant ID + Severity */}
      <Card className={`border-2 ${result.severity === 'healthy' ? 'border-green-300' : result.severity === 'critical' || result.severity === 'severe' ? 'border-red-300' : 'border-orange-200'}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {result.image_url && (
              <img src={result.image_url} alt="Plant" className="h-24 w-24 object-cover rounded-xl shrink-0" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-lg">{result.plant_name || 'Plant Identified'}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1 ${sev.cls}`}>
                  <SevIcon className="h-3 w-3" /> {sev.label}
                </span>
                {result.urgency && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${urgencyConfig[result.urgency]}`}>
                    ⚡ {result.urgency?.toUpperCase()} urgency
                  </span>
                )}
              </div>
              <p className="text-primary font-semibold mt-1">{result.disease_name || 'No disease detected'}</p>
              <p className="text-sm text-muted-foreground mt-1">{result.disease_description}</p>
              {result.confidence_pct && (
                <p className="text-xs text-muted-foreground mt-1">AI Confidence: <span className="font-semibold text-foreground">{result.confidence_pct}%</span></p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Symptoms */}
      {result.symptoms?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Microscope className="h-4 w-4 text-primary" /> Observed Symptoms</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-1">
              {result.symptoms.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-orange-500 font-bold mt-0.5">•</span>
                  <span className="text-muted-foreground">{s}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Local Treatment */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="text-lg">🌿</span> Local Treatment / Obusuubuzi bw'Ekyenyumirwa
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">{result.local_treatment}</div>
        </CardContent>
      </Card>

      {/* Scientific Treatment */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-blue-600" /> Scientific Treatment / Obusuubuzi bwa Sayansi
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{result.scientific_treatment}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      {/* Location Suggestion */}
      {result.location_suggestion && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4 text-amber-600" /> Naawe Genda Wa? / Where to Get Help
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">{result.location_suggestion}</div>
          </CardContent>
        </Card>
      )}

      {/* Prevention Tips */}
      {result.prevention_tips?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Prevention Tips</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {result.prevention_tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-green-600 font-bold mt-0.5">✓</span>
                  <span className="text-muted-foreground">{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" className="w-full gap-2" onClick={onReset}>
        <RefreshCw className="h-4 w-4" /> Scan Another Plant
      </Button>
    </div>
  );
}

// ── History Detail (expanded) ─────────────────────────────────────────────────

function HistoryDetail({ item }) {
  return (
    <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
      {item.disease_description && (
        <p className="text-sm text-muted-foreground">{item.disease_description}</p>
      )}
      {item.local_treatment && (
        <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-200">
          <p className="text-xs font-semibold text-green-700 mb-1">🌿 Local Treatment</p>
          <p className="text-xs whitespace-pre-line">{item.local_treatment}</p>
        </div>
      )}
      {item.location_suggestion && (
        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200">
          <p className="text-xs font-semibold text-amber-700 mb-1">📍 Where to Get Help</p>
          <p className="text-xs whitespace-pre-line">{item.location_suggestion}</p>
        </div>
      )}
      {item.location?.address && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" /> {item.location.address}
        </p>
      )}
    </div>
  );
}