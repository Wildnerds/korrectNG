'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { FormInput, FormTextarea, FormSelect } from '@/components/FormInput';
import Cookies from 'js-cookie';
import type { ContractMaterial, MilestoneInput } from '@korrectng/shared';

interface ContractTemplate {
  trade: string;
  defaultMilestones: {
    order: number;
    name: string;
    description: string;
    percentage: number;
    triggerCondition: string;
  }[];
  commonDeliverables: string[];
  commonExclusions: string[];
  materialsNote: string;
}

interface ContractBuilderProps {
  bookingId: string;
  booking: {
    jobType: string;
    description: string;
    finalPrice?: number;
    estimatedPrice: number;
    artisanProfile?: {
      trade: string;
    };
  };
  onSuccess?: (contractId: string) => void;
}

export default function ContractBuilder({ bookingId, booking, onSuccess }: ContractBuilderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [template, setTemplate] = useState<ContractTemplate | null>(null);

  // Form state
  const [title, setTitle] = useState(`${booking.jobType} Service Contract`);
  const [scopeOfWork, setScopeOfWork] = useState(booking.description);
  const [deliverables, setDeliverables] = useState<string[]>(['']);
  const [exclusions, setExclusions] = useState<string[]>(['']);
  const [materialsResponsibility, setMaterialsResponsibility] = useState<'customer' | 'artisan' | 'shared'>('artisan');
  const [materialsList, setMaterialsList] = useState<ContractMaterial[]>([]);
  const [startDate, setStartDate] = useState('');
  const [estimatedEndDate, setEstimatedEndDate] = useState('');
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { order: 1, name: 'Project Initiation', description: 'Initial deposit to commence work', percentage: 30 },
    { order: 2, name: 'Midpoint Progress', description: 'Work is approximately 50% complete', percentage: 40 },
    { order: 3, name: 'Project Completion', description: 'All work completed and ready for inspection', percentage: 30 },
  ]);

  // Load trade-specific template
  useEffect(() => {
    async function loadTemplate() {
      if (!booking.artisanProfile?.trade) return;

      try {
        const token = Cookies.get('token');
        const res = await apiFetch<ContractTemplate>(
          `/contracts/templates/${booking.artisanProfile.trade}`,
          { token }
        );
        if (res.data) {
          setTemplate(res.data);
          // Pre-fill with template defaults
          if (res.data.defaultMilestones.length > 0) {
            setMilestones(res.data.defaultMilestones.map(m => ({
              order: m.order,
              name: m.name,
              description: m.description,
              percentage: m.percentage,
              triggerCondition: m.triggerCondition,
            })));
          }
          if (res.data.commonDeliverables.length > 0) {
            setDeliverables(res.data.commonDeliverables);
          }
          if (res.data.commonExclusions.length > 0) {
            setExclusions(res.data.commonExclusions);
          }
        }
      } catch {
        // Use defaults if template fails to load
      }
    }
    loadTemplate();
  }, [booking.artisanProfile?.trade]);

  const totalAmount = booking.finalPrice || booking.estimatedPrice;
  const platformFee = Math.round(totalAmount * 0.10);
  const artisanEarnings = totalAmount - platformFee;

  const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);

  const addDeliverable = () => setDeliverables([...deliverables, '']);
  const removeDeliverable = (index: number) => setDeliverables(deliverables.filter((_, i) => i !== index));
  const updateDeliverable = (index: number, value: string) => {
    const updated = [...deliverables];
    updated[index] = value;
    setDeliverables(updated);
  };

  const addExclusion = () => setExclusions([...exclusions, '']);
  const removeExclusion = (index: number) => setExclusions(exclusions.filter((_, i) => i !== index));
  const updateExclusion = (index: number, value: string) => {
    const updated = [...exclusions];
    updated[index] = value;
    setExclusions(updated);
  };

  const addMaterial = () => setMaterialsList([...materialsList, { item: '', estimatedCost: 0, providedBy: 'artisan' }]);
  const removeMaterial = (index: number) => setMaterialsList(materialsList.filter((_, i) => i !== index));
  const updateMaterial = (index: number, field: keyof ContractMaterial, value: any) => {
    const updated = [...materialsList];
    (updated[index] as any)[field] = value;
    setMaterialsList(updated);
  };

  const updateMilestone = (index: number, field: keyof MilestoneInput, value: any) => {
    const updated = [...milestones];
    (updated[index] as any)[field] = value;
    setMilestones(updated);
  };

  const handleSubmit = async (e: React.FormEvent, send: boolean = false) => {
    e.preventDefault();
    setError('');

    if (totalPercentage !== 100) {
      setError('Milestone percentages must add up to 100%');
      return;
    }

    const validDeliverables = deliverables.filter(d => d.trim().length > 0);
    if (validDeliverables.length === 0) {
      setError('At least one deliverable is required');
      return;
    }

    setLoading(true);

    try {
      const token = Cookies.get('token');
      const res = await apiFetch<{ _id: string }>('/contracts', {
        method: 'POST',
        token,
        body: JSON.stringify({
          bookingId,
          title,
          scopeOfWork,
          deliverables: validDeliverables,
          exclusions: exclusions.filter(e => e.trim().length > 0),
          materialsResponsibility,
          materialsList: materialsList.filter(m => m.item.trim().length > 0),
          startDate,
          estimatedEndDate,
          milestones,
        }),
      });

      if (res.data) {
        // If send is true, also send the contract
        if (send) {
          await apiFetch(`/contracts/${res.data._id}/send`, {
            method: 'POST',
            token,
          });
        }

        if (onSuccess) {
          onSuccess(res.data._id);
        } else {
          router.push(`/dashboard/artisan/contracts/${res.data._id}`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create contract');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Contract Title */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Contract Details</h2>

        <FormInput
          label="Contract Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., AC Installation Service Contract"
          required
        />

        <div className="mt-4">
          <FormTextarea
            label="Scope of Work"
            value={scopeOfWork}
            onChange={(e) => setScopeOfWork(e.target.value)}
            placeholder="Describe the work to be performed in detail..."
            rows={5}
            required
          />
        </div>
      </div>

      {/* Deliverables */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Deliverables</h2>
          <button
            type="button"
            onClick={addDeliverable}
            className="text-brand-green hover:text-brand-green-dark font-medium text-sm"
          >
            + Add Deliverable
          </button>
        </div>

        <div className="space-y-3">
          {deliverables.map((item, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => updateDeliverable(index, e.target.value)}
                placeholder={`Deliverable ${index + 1}`}
                className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
              />
              {deliverables.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDeliverable(index)}
                  className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-md"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Exclusions */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Exclusions (Optional)</h2>
          <button
            type="button"
            onClick={addExclusion}
            className="text-brand-green hover:text-brand-green-dark font-medium text-sm"
          >
            + Add Exclusion
          </button>
        </div>
        <p className="text-sm text-brand-gray mb-3">
          List things NOT included in this contract to avoid misunderstandings.
        </p>

        <div className="space-y-3">
          {exclusions.map((item, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => updateExclusion(index, e.target.value)}
                placeholder={`Exclusion ${index + 1}`}
                className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
              />
              <button
                type="button"
                onClick={() => removeExclusion(index)}
                className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-md"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Materials */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Materials Responsibility</h2>

        {template?.materialsNote && (
          <p className="text-sm text-brand-gray mb-4 p-3 bg-blue-50 rounded-lg">
            {template.materialsNote}
          </p>
        )}

        <FormSelect
          label="Who provides materials?"
          value={materialsResponsibility}
          onChange={(e) => setMaterialsResponsibility(e.target.value as any)}
        >
          <option value="artisan">Artisan provides all materials</option>
          <option value="customer">Customer provides all materials</option>
          <option value="shared">Shared responsibility (specify below)</option>
        </FormSelect>

        {materialsResponsibility === 'shared' && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">Materials List</h3>
              <button
                type="button"
                onClick={addMaterial}
                className="text-brand-green hover:text-brand-green-dark font-medium text-sm"
              >
                + Add Material
              </button>
            </div>

            {materialsList.map((material, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={material.item}
                  onChange={(e) => updateMaterial(index, 'item', e.target.value)}
                  placeholder="Material item"
                  className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                />
                <input
                  type="number"
                  value={material.estimatedCost}
                  onChange={(e) => updateMaterial(index, 'estimatedCost', parseInt(e.target.value) || 0)}
                  placeholder="Cost"
                  className="w-28 px-3 py-2 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                />
                <select
                  value={material.providedBy}
                  onChange={(e) => updateMaterial(index, 'providedBy', e.target.value)}
                  className="px-3 py-2 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                >
                  <option value="customer">Customer</option>
                  <option value="artisan">Artisan</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeMaterial(index)}
                  className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-md"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Timeline</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            type="date"
            label="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <FormInput
            type="date"
            label="Estimated End Date"
            value={estimatedEndDate}
            onChange={(e) => setEstimatedEndDate(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Payment Milestones</h2>
        <p className="text-sm text-brand-gray mb-4">
          Total: {totalPercentage}% {totalPercentage !== 100 && <span className="text-red-500">(must equal 100%)</span>}
        </p>

        <div className="space-y-4">
          {milestones.map((milestone, index) => (
            <div key={index} className="p-4 border-2 border-gray-200 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Milestone {milestone.order}</h3>
                <span className="text-brand-green font-semibold">
                  {milestone.percentage}% = ₦{Math.round((milestone.percentage / 100) * totalAmount).toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={milestone.name}
                  onChange={(e) => updateMilestone(index, 'name', e.target.value)}
                  placeholder="Milestone name"
                  className="px-3 py-2 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                />
                <input
                  type="number"
                  value={milestone.percentage}
                  onChange={(e) => updateMilestone(index, 'percentage', parseInt(e.target.value) || 0)}
                  min="1"
                  max="100"
                  className="px-3 py-2 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
                />
              </div>

              <textarea
                value={milestone.description}
                onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                placeholder="Describe what will be delivered at this milestone..."
                rows={2}
                className="mt-3 w-full px-3 py-2 border-2 border-gray-200 rounded-md focus:outline-none focus:border-brand-green"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Summary */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Pricing Summary</h2>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Total Contract Value</span>
            <span className="font-semibold">₦{totalAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-brand-gray">
            <span>Platform Fee (10%)</span>
            <span>- ₦{platformFee.toLocaleString()}</span>
          </div>
          <div className="border-t pt-2 flex justify-between text-brand-green font-semibold">
            <span>Your Earnings</span>
            <span>₦{artisanEarnings.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-end">
        <button
          type="button"
          onClick={(e) => handleSubmit(e, false)}
          disabled={loading}
          className="px-6 py-3 border-2 border-brand-green text-brand-green rounded-md hover:bg-brand-green hover:text-white transition-colors font-medium disabled:opacity-50"
        >
          Save as Draft
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e, true)}
          disabled={loading || totalPercentage !== 100}
          className="px-6 py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create & Send to Customer'}
        </button>
      </div>
    </form>
  );
}
