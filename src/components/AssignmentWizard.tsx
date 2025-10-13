import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Stethoscope, ChevronRight, ChevronLeft, Check, Building2, Repeat } from 'lucide-react';
import { representativeService } from '../lib/services/data-services';
import { getRepresentativeById } from '../lib/api/representatives-enhanced';
import { getClinicWithDoctors } from '../lib/api/clinics';
// import { assignmentService } from '../lib/services/assignment-service-simple';
import type { SimpleRepresentative } from '../lib/data-access/interfaces';
import type { ClinicWithDoctors } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { t } from '../lib/i18n';

interface AssignmentWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface DoctorSchedule {
  date: string;
  startTime: string;
  endTime: string;
  weeks: number;
}

interface WizardData {
  representativeId: string;
  selectedClinicIds: string[];
  selectedDoctors: string[];
  schedules: Record<string, DoctorSchedule>; // doctorId -> schedule
}

export default function AssignmentWizard({ onClose, onSuccess }: AssignmentWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Data states - simplified types
  const [representatives, setRepresentatives] = useState<SimpleRepresentative[]>([]);
  const [clinicOptions, setClinicOptions] = useState<{ id: string; name: string; }[]>([]);
  const [doctorsByClinic, setDoctorsByClinic] = useState<Record<string, { id: string; first_name: string; last_name: string; clinicId: string; clinicName: string; specialization?: string; }[]>>({});
  const [availableDoctors, setAvailableDoctors] = useState<{ id: string; first_name: string; last_name: string; clinicIds: string[]; clinicNames: string[]; specialization?: string; }[]>([]);

  // Wizard form data
  const [wizardData, setWizardData] = useState<WizardData>({
    representativeId: '',
    selectedClinicIds: [],
    selectedDoctors: [],
    schedules: {}
  });

  const steps = [
    { number: 1, title: 'Nümayəndə seçin', icon: User },
    { number: 2, title: 'Klinikaları seçin', icon: Building2 },
    { number: 3, title: 'Həkimləri seçin', icon: Stethoscope },
    { number: 4, title: 'Tarix təyin edin', icon: Calendar },
  ];


  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (wizardData.representativeId) {
      loadClinicsAndDoctorsForRepresentative(wizardData.representativeId);
    } else {
      setClinicOptions([]);
      setDoctorsByClinic({});
      setAvailableDoctors([]);
      setWizardData(prev => ({ ...prev, selectedClinicIds: [], selectedDoctors: [], schedules: {} }));
    }
  }, [wizardData.representativeId]);

  useEffect(() => {
    // When clinic selection changes, update available doctors accordingly
    const selected = new Set(wizardData.selectedClinicIds);
    const doctorMap: Record<string, { id: string; first_name: string; last_name: string; clinicIds: string[]; clinicNames: string[]; specialization?: string; }> = {};
    Object.entries(doctorsByClinic).forEach(([clinicId, docs]) => {
      if (!selected.has(clinicId)) return;
      docs.forEach(d => {
        if (!doctorMap[d.id]) {
          doctorMap[d.id] = {
            id: d.id,
            first_name: d.first_name,
            last_name: d.last_name,
            clinicIds: [d.clinicId],
            clinicNames: [d.clinicName],
            specialization: d.specialization
          };
        } else {
          if (!doctorMap[d.id].clinicIds.includes(d.clinicId)) {
            doctorMap[d.id].clinicIds.push(d.clinicId);
            doctorMap[d.id].clinicNames.push(d.clinicName);
          }
        }
      });
    });
    setAvailableDoctors(Object.values(doctorMap));

    // Clean schedules for deselected doctors
    setWizardData(prev => {
      const newSelectedDoctors = prev.selectedDoctors.filter(id => !!doctorMap[id]);
      const newSchedules: Record<string, DoctorSchedule> = {};
      newSelectedDoctors.forEach(id => {
        newSchedules[id] = prev.schedules[id] || defaultSchedule();
      });
      return { ...prev, selectedDoctors: newSelectedDoctors, schedules: newSchedules };
    });
  }, [wizardData.selectedClinicIds, doctorsByClinic]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const repsData = await representativeService.getAll();
      setRepresentatives(repsData);
    } catch (err: any) {
      setError(t('assignments.failedToLoadData') + ': ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadClinicsAndDoctorsForRepresentative = async (repId: string) => {
    try {
      setLoading(true);
      // 1) Fetch representative with clinics
      const rep = await getRepresentativeById(repId);
      const clinics = (rep.clinics || []).map((rc: any) => rc.clinic);
      setClinicOptions(clinics.map((c: any) => ({ id: c.id, name: c.name })));

      // 2) Fetch doctors per clinic
      const clinicDetails: ClinicWithDoctors[] = await Promise.all(clinics.map((c: any) => getClinicWithDoctors(c.id)));
      const nextDoctorsByClinic: Record<string, { id: string; first_name: string; last_name: string; clinicId: string; clinicName: string; specialization?: string; }[]> = {};
      clinicDetails.forEach((cd: ClinicWithDoctors) => {
        const clinicId = cd.id;
        const clinicName = cd.name;
        nextDoctorsByClinic[clinicId] = (cd.doctors || []).map((d: any) => ({
          id: d.doctor.id,
          first_name: d.doctor.first_name,
          last_name: d.doctor.last_name,
          clinicId,
          clinicName,
          specialization: d.doctor.specialization?.display_name || d.doctor.specialty
        }));
      });
      setDoctorsByClinic(nextDoctorsByClinic);
      // Reset clinic/doctor selection on rep change
      setWizardData(prev => ({ ...prev, selectedClinicIds: [], selectedDoctors: [], schedules: {} }));
    } catch (e: any) {
      setError('Klinikalar və həkimlər yüklənmədi: ' + (e.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const updateWizardData = (updates: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!wizardData.representativeId;
      case 2:
        return wizardData.selectedClinicIds.length > 0;
      case 3:
        return wizardData.selectedDoctors.length > 0;
      case 4:
        return wizardData.selectedDoctors.every(id => !!wizardData.schedules[id]?.date && !!wizardData.schedules[id]?.weeks);
      default:
        return false;
    }
  };

  const handleClinicToggle = (clinicId: string) => {
    const selected = new Set(wizardData.selectedClinicIds);
    if (selected.has(clinicId)) selected.delete(clinicId); else selected.add(clinicId);
    updateWizardData({ selectedClinicIds: Array.from(selected) });
  };

  const handleDoctorToggle = (doctorId: string) => {
    const newSelected = wizardData.selectedDoctors.includes(doctorId)
      ? wizardData.selectedDoctors.filter(id => id !== doctorId)
      : [...wizardData.selectedDoctors, doctorId];
    const newSchedules: Record<string, DoctorSchedule> = { ...wizardData.schedules };
    if (!newSelected.includes(doctorId)) {
      delete newSchedules[doctorId];
    } else if (!newSchedules[doctorId]) {
      newSchedules[doctorId] = defaultSchedule();
    }
    updateWizardData({ selectedDoctors: newSelected, schedules: newSchedules });
  };

  const handleScheduleChange = (doctorId: string, updates: Partial<DoctorSchedule>) => {
    updateWizardData({ schedules: { ...wizardData.schedules, [doctorId]: { ...wizardData.schedules[doctorId], ...updates } } });
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');
      const promises: Promise<any>[] = [];
      wizardData.selectedDoctors.forEach(doctorId => {
        const sched = wizardData.schedules[doctorId];
        if (!sched) return;
        const date = new Date(sched.date);
        const weekdayName = getWeekdayName(date.getDay());
        promises.push(
          (async () => {
            const { assignmentService } = await import('../lib/services/assignment-service-simple');
            await assignmentService.createAssignment({
              rep_id: wizardData.representativeId,
              doctor_id: doctorId,
              visit_days: [weekdayName],
              start_time: undefined as any,
              end_time: undefined as any,
              product_ids: []
            });
          })()
        );
      });
      await Promise.all(promises);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || t('assignments.failedToCreateAssignments'));
    } finally {
      setSubmitting(false);
    }
  };

  const defaultSchedule = (): DoctorSchedule => ({
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    weeks: 1
  });

  const getWeekdayName = (weekday: number): string => {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    return days[weekday];
  };

  // removed unused helpers

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">{t('assignments.loadingAssignmentData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{t('assignments.createNewAssignment')}</h2>
            <p className="text-sm text-gray-600 mt-1">{t('assignments.stepOf')} {currentStep} / {steps.length}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${currentStep === step.number 
                      ? 'bg-blue-500 text-white' 
                      : currentStep > step.number 
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }
                  `}>
                    {currentStep > step.number ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <step.icon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="ml-3 hidden sm:block">
                    <p className={`text-sm font-medium ${
                      currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="p-6">
          {/* Step 1: Representative */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Nümayəndə seçin</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {representatives.map((rep) => (
                  <div
                    key={rep.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${wizardData.representativeId === rep.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                    onClick={() => updateWizardData({ representativeId: rep.id, selectedClinicIds: [], selectedDoctors: [], schedules: {} })}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`${wizardData.representativeId === rep.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'} w-10 h-10 rounded-full flex items-center justify-center`}>
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{(rep as any).first_name} {(rep as any).last_name}</p>
                        <p className="text-sm text-gray-500">Nümayəndə</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Clinics */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Klinikaları seçin</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {clinicOptions.map(c => (
                  <label key={c.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wizardData.selectedClinicIds.includes(c.id)}
                      onChange={() => handleClinicToggle(c.id)}
                      className="mr-3 rounded border-gray-300 text-blue-600"
                    />
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-700">{c.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Doctors */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Həkimləri seçin</h3>
                <p className="text-sm text-gray-600 mb-4">Seçilən klinikalarda işləyən həkimlər göstərilir</p>
                
                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                  {availableDoctors.map((doctor) => (
                    <label
                      key={doctor.id}
                      className="flex items-center p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={wizardData.selectedDoctors.includes(doctor.id)}
                        onChange={() => handleDoctorToggle(doctor.id)}
                        className="mr-4 h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <Stethoscope className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              Dr. {doctor.first_name} {doctor.last_name}
                            </p>
                            <p className="text-sm text-gray-500">{doctor.specialization || ''}</p>
                            <p className="text-xs text-gray-400">{doctor.clinicNames.join(', ')}</p>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {wizardData.selectedDoctors.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Seçildi:</strong> {wizardData.selectedDoctors.length} həkim
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {availableDoctors.filter(d => wizardData.selectedDoctors.includes(d.id)).map((doctor) => (
                        <span
                          key={doctor.id}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
                        >
                          Dr. {doctor.first_name} {doctor.last_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Per-doctor schedules */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Hər həkim üçün tarix</h3>
                <div className="space-y-6">
                  {availableDoctors.filter(d => wizardData.selectedDoctors.includes(d.id)).map((doctor) => {
                    const sched = wizardData.schedules[doctor.id] || defaultSchedule();
                    return (
                      <div key={doctor.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <Stethoscope className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">Dr. {doctor.first_name} {doctor.last_name}</h4>
                            <p className="text-xs text-gray-500">{doctor.clinicNames.join(', ')}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="form-label">Tarix</label>
                            <input type="date" className="form-input" value={sched.date} onChange={(e) => handleScheduleChange(doctor.id, { date: e.target.value })} />
                          </div>
                          <div>
                            <label className="form-label flex items-center gap-1"><Repeat className="w-4 h-4" /> Təkrarlanma</label>
                            <select className="form-input" value={sched.weeks} onChange={(e) => handleScheduleChange(doctor.id, { weeks: Number(e.target.value) })}>
                              <option value={1}>1 həftə</option>
                              <option value={2}>2 həftə</option>
                              <option value={4}>4 həftə (1 ay)</option>
                              <option value={8}>8 həftə</option>
                              <option value={12}>12 həftə</option>
                              <option value={26}>26 həftə (6 ay)</option>
                              <option value={52}>52 həftə (1 il)</option>
                            </select>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          {new Date(sched.date).toLocaleDateString('az-AZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('assignments.previous')}
          </button>

          <div className="text-sm text-gray-500">
            {t('assignments.stepOf')} {currentStep} / {steps.length}
          </div>

          {currentStep < steps.length ? (
            <button
              onClick={nextStep}
              disabled={!canProceedFromStep(currentStep)}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('assignments.next')}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceedFromStep(currentStep) || submitting}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  {t('assignments.creatingAssignments')}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {t('assignments.createAssignments')}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
