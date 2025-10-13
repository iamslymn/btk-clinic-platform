import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Stethoscope, Package, Plus, Trash2 } from 'lucide-react';
import { getRepresentatives } from '../lib/api/representatives';
import { getDoctors } from '../lib/api/doctors-enhanced';
import { getProducts } from '../lib/api/products-enhanced';
import { createWeeklyAssignments } from '../lib/api/assignments-quiet';
import type { Representative, DoctorWithWorkplacesAndSpecialization, ProductWithDetails } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { t } from '../lib/i18n';

interface CalendarAssignmentFormProps {
  onClose: () => void;
  onSuccess: () => void;
  selectedDate?: Date;
}

interface AssignmentFormData {
  representativeId: string;
  doctorIds: string[];
  productIds: string[];
  recurringWeeks: number;
  notes: string;
}

// WEEKDAYS will be created inside the component to access translations

export default function CalendarAssignmentForm({ onClose, onSuccess, selectedDate }: CalendarAssignmentFormProps) {
  // Create WEEKDAYS array with translations
  const WEEKDAYS = [
    { value: 0, label: t('assignments.weekdays.sunday'), short: t('assignments.weekdays.sun') },
    { value: 1, label: t('assignments.weekdays.monday'), short: t('assignments.weekdays.mon') },
    { value: 2, label: t('assignments.weekdays.tuesday'), short: t('assignments.weekdays.tue') },
    { value: 3, label: t('assignments.weekdays.wednesday'), short: t('assignments.weekdays.wed') },
    { value: 4, label: t('assignments.weekdays.thursday'), short: t('assignments.weekdays.thu') },
    { value: 5, label: t('assignments.weekdays.friday'), short: t('assignments.weekdays.fri') },
    { value: 6, label: t('assignments.weekdays.saturday'), short: t('assignments.weekdays.sat') },
  ];


  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [doctors, setDoctors] = useState<DoctorWithWorkplacesAndSpecialization[]>([]);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Calendar state
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date());
  const [selectedWeekday, setSelectedWeekday] = useState<number>(
    selectedDate ? selectedDate.getDay() : 1 // Default to Monday
  );

  // Form state
  const [formData, setFormData] = useState<AssignmentFormData>({
    representativeId: '',
    doctorIds: [],
    productIds: [],
    recurringWeeks: 4, // Default to 4 weeks
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [repsData, doctorsData, productsData] = await Promise.all([
        getRepresentatives(),
        getDoctors(),
        getProducts()
      ]);
      
      setRepresentatives(repsData);
      setDoctors(doctorsData);
      setProducts(productsData);
    } catch (err: any) {
      setError(t('assignments.failedToLoadData') + ': ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const handleDateClick = (date: Date) => {
    setSelectedWeekday(date.getDay());
  };

  const handleDoctorToggle = (doctorId: string) => {
    setFormData(prev => ({
      ...prev,
      doctorIds: prev.doctorIds.includes(doctorId)
        ? prev.doctorIds.filter(id => id !== doctorId)
        : [...prev.doctorIds, doctorId]
    }));
  };

  const handleProductToggle = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter(id => id !== productId)
        : [...prev.productIds, productId]
    }));
  };

  const getNextDateForWeekday = (weekday: number): Date => {
    const today = new Date();
    const daysUntilTarget = (weekday - today.getDay() + 7) % 7;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
    return targetDate;
  };

  const generateRecurringDates = (): Date[] => {
    const startDate = getNextDateForWeekday(selectedWeekday);
    const dates = [];
    
    for (let i = 0; i < formData.recurringWeeks; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + (i * 7));
      dates.push(date);
    }
    
    return dates;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.representativeId) {
      setError(t('assignments.pleaseSelectRepresentative'));
      return;
    }
    
    if (formData.doctorIds.length === 0) {
      setError(t('assignments.pleaseSelectAtLeastOneDoctor'));
      return;
    }

    if (formData.productIds.length === 0) {
      setError(t('assignments.pleaseSelectAtLeastOneProduct'));
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const startDate = getNextDateForWeekday(selectedWeekday);
      
      await createWeeklyAssignments({
        representativeId: formData.representativeId,
        doctorIds: formData.doctorIds,
        productIds: formData.productIds,
        weekday: selectedWeekday,
        recurringWeeks: formData.recurringWeeks,
        startDate: startDate,
        notes: formData.notes || undefined
      });
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || t('assignments.failedToCreateAssignments'));
    } finally {
      setSubmitting(false);
    }
  };

  const monthNames = [
    t('assignments.months.january'), t('assignments.months.february'), t('assignments.months.march'), 
    t('assignments.months.april'), t('assignments.months.may'), t('assignments.months.june'),
    t('assignments.months.july'), t('assignments.months.august'), t('assignments.months.september'), 
    t('assignments.months.october'), t('assignments.months.november'), t('assignments.months.december')
  ];

  const recurringDates = generateRecurringDates();

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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{t('assignments.createWeeklyAssignment')}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Calendar Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {t('assignments.selectDayOfWeek')}
                </h3>
                
                {/* Calendar */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <button
                      type="button"
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                      className="p-2 hover:bg-gray-200 rounded"
                    >
                      ←
                    </button>
                    <h4 className="font-medium">
                      {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                      className="p-2 hover:bg-gray-200 rounded"
                    >
                      →
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center">
                    {WEEKDAYS.map(day => (
                      <div key={day.value} className="p-2 text-xs font-medium text-gray-500">
                        {day.short}
                      </div>
                    ))}
                    
                    {generateCalendarDays().map((date, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => date && handleDateClick(date)}
                        disabled={!date}
                        className={`
                          p-2 text-sm rounded transition-colors
                          ${!date ? 'invisible' : ''}
                          ${date && date.getDay() === selectedWeekday 
                            ? 'bg-blue-500 text-white' 
                            : 'hover:bg-gray-200'
                          }
                        `}
                      >
                        {date?.getDate()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weekday Selector */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('assignments.selectedDayOfWeek')}
                  </label>
                  <select
                    value={selectedWeekday}
                    onChange={(e) => setSelectedWeekday(Number(e.target.value))}
                    className="form-input"
                  >
                    {WEEKDAYS.map(day => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Recurring Schedule Preview */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">{t('assignments.upcomingAssignments')}</h4>
                  <div className="space-y-1">
                    {recurringDates.slice(0, 4).map((date, index) => (
                      <div key={index} className="text-sm text-blue-700">
                        {date.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    ))}
                    {formData.recurringWeeks > 4 && (
                      <div className="text-sm text-blue-600">
                        +{formData.recurringWeeks - 4} {t('assignments.moreWeeks')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Assignment Details */}
            <div className="space-y-6">
              {/* Basic Assignment Info */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {t('assignments.assignmentDetails')}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="form-label">{t('assignments.representative')} *</label>
                    <select
                      value={formData.representativeId}
                      onChange={(e) => setFormData(prev => ({ ...prev, representativeId: e.target.value }))}
                      className="form-input"
                      required
                    >
                      <option value="">{t('assignments.selectRepresentativeRequired')}</option>
                      {representatives.map(rep => (
                        <option key={rep.id} value={rep.id}>
                          {rep.first_name} {rep.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Time fields removed: date-based scheduling only */}

                  <div>
                    <label className="form-label">{t('assignments.recurringWeeks')}</label>
                    <select
                      value={formData.recurringWeeks}
                      onChange={(e) => setFormData(prev => ({ ...prev, recurringWeeks: Number(e.target.value) }))}
                      className="form-input"
                    >
                      <option value={1}>{t('assignments.recurringOptions.oneWeek')}</option>
                      <option value={2}>{t('assignments.recurringOptions.twoWeeks')}</option>
                      <option value={4}>{t('assignments.recurringOptions.fourWeeks')}</option>
                      <option value={8}>{t('assignments.recurringOptions.eightWeeks')}</option>
                      <option value={12}>{t('assignments.recurringOptions.twelveWeeks')}</option>
                      <option value={26}>{t('assignments.recurringOptions.sixMonths')}</option>
                      <option value={52}>{t('assignments.recurringOptions.oneYear')}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Doctor Selection */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" />
                  {t('assignments.selectDoctorsRequired')} ({formData.doctorIds.length} seçildi)
                </h4>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  {doctors.map(doctor => (
                    <label
                      key={doctor.id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={formData.doctorIds.includes(doctor.id)}
                        onChange={() => handleDoctorToggle(doctor.id)}
                        className="mr-3 rounded border-gray-300 text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          Dr. {doctor.first_name} {doctor.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {doctor.specialization?.display_name || doctor.specialty}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Product Selection */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {t('assignments.selectProductsRequired')} ({formData.productIds.length} seçildi)
                </h4>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  {products.map(product => (
                    <label
                      key={product.id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={formData.productIds.includes(product.id)}
                        onChange={() => handleProductToggle(product.id)}
                        className="mr-3 rounded border-gray-300 text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.brand?.name}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="form-label">{t('assignments.notesOptional')}</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="form-input"
                  rows={3}
                  placeholder={t('assignments.additionalNotesPlaceholder')}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={submitting}
            >
              {t('assignments.cancel')}
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  {t('assignments.creatingAssignments')}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {formData.recurringWeeks} {t('assignments.createWeeklyAssignments')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
