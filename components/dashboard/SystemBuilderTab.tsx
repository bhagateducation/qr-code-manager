'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Plus,
  Trash2,
  Check,
  Tag,
  Hash,
  DollarSign,
  Calendar,
  Globe,
  Sliders,
  ChevronRight,
  Database,
} from 'lucide-react';

interface Field {
  id: string;
  name: string;
  key: string;
  type: string;
  required: boolean;
}

export default function SystemBuilderTab() {
  const [activeSystem, setActiveSystem] = useState('inventory');
  const [fields, setFields] = useState<Field[]>([
    { id: '1', name: 'SKU Identifier', key: 'sku', type: 'text', required: true },
    { id: '2', name: 'Item Name', key: 'name', type: 'text', required: true },
    { id: '3', name: 'Unit Price', key: 'price', type: 'currency', required: true },
    { id: '4', name: 'Quantity In Stock', key: 'qty', type: 'number', required: false },
    { id: '5', name: 'Warehouse Location', key: 'location', type: 'text', required: false },
    { id: '6', name: 'Restock Date', key: 'restock_date', type: 'date', required: false },
  ]);

  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [isAdding, setIsAdding] = useState(false);

  const systems = [
    { id: 'inventory', name: 'Warehouse Inventory OS', records: 48, icon: '📦' },
    { id: 'restaurant', name: 'Restaurant Dine-In POS', records: 32, icon: '🍽️' },
    { id: 'events', name: 'VIP Conference Badging', records: 120, icon: '🎫' },
    { id: 'equipment', name: 'Heavy Machinery Shield', records: 19, icon: '⚙️' },
  ];

  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    const newField: Field = {
      id: Date.now().toString(),
      name: newFieldName.trim(),
      key: newFieldName.trim().toLowerCase().replace(/\s+/g, '_'),
      type: newFieldType,
      required: false,
    };
    setFields([...fields, newField]);
    setNewFieldName('');
    setIsAdding(false);
  };

  const handleDeleteField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'number':
        return <Hash className="w-4 h-4 text-amber-600" />;
      case 'currency':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'date':
        return <Calendar className="w-4 h-4 text-indigo-600" />;
      case 'url':
        return <Globe className="w-4 h-4 text-blue-600" />;
      default:
        return <Tag className="w-4 h-4 text-brand" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="space-y-6"
    >
      {/* Top Header */}
      <div className="p-6 rounded-3xl bg-white border border-line shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-ink tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand" />
            <span>Universal Business Schema Builder</span>
          </h2>
          <p className="text-xs text-muted mt-1">
            Define custom multi-attribute database models without code and bind them to physical QR codes.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="px-5 py-2.5 rounded-2xl bg-brand text-white font-bold text-xs shadow-md shadow-brand/20 hover:bg-[#4d36bd] active:scale-95 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Field</span>
        </button>
      </div>

      {/* Systems Switcher Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {systems.map((sys) => (
          <button
            key={sys.id}
            onClick={() => setActiveSystem(sys.id)}
            className={`p-4 rounded-3xl border text-left transition-all ${
              activeSystem === sys.id
                ? 'border-brand bg-white shadow-soft ring-2 ring-brand/15'
                : 'border-line bg-white/60 hover:bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-2xl mb-2">{sys.icon}</div>
            <div className="text-xs font-bold text-ink truncate">{sys.name}</div>
            <div className="text-[11px] text-muted mt-0.5">{sys.records} records linked</div>
          </button>
        ))}
      </div>

      {/* Field Schema Configurator */}
      <div className="p-6 rounded-3xl bg-white border border-line shadow-soft">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-sm text-ink flex items-center gap-2">
              <Database className="w-4 h-4 text-brand" />
              <span>Defined Attributes & Field Types</span>
            </h3>
            <p className="text-xs text-muted">These fields automatically populate the public QR scan view</p>
          </div>
          <span className="text-xs font-semibold text-muted bg-page px-3 py-1 rounded-full border border-line">
            {fields.length} Active Fields
          </span>
        </div>

        {/* Add Field Modal / Form */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-5 rounded-2xl bg-page border border-brand/30 mb-6 overflow-hidden"
            >
              <h4 className="text-xs font-bold text-ink mb-3">Add New Custom Field</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="e.g. Serial Number, Expiry Date"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-line text-xs bg-white focus:outline-none focus:border-brand"
                />
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-line text-xs bg-white focus:outline-none focus:border-brand"
                >
                  <option value="text">Text (Single-line)</option>
                  <option value="number">Number / Integer</option>
                  <option value="currency">Currency ($ USD / ₹ INR)</option>
                  <option value="date">Date & Timestamp</option>
                  <option value="url">Web URL Link</option>
                </select>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddField}
                    className="flex-1 py-2.5 rounded-xl bg-brand text-white font-bold text-xs shadow-sm"
                  >
                    Save Field
                  </button>
                  <button
                    onClick={() => setIsAdding(false)}
                    className="py-2.5 px-4 rounded-xl border border-line text-xs text-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fields List */}
        <div className="divide-y divide-line">
          {fields.map((field) => (
            <div
              key={field.id}
              className="py-3.5 flex items-center justify-between hover:bg-page/40 px-2 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-page border border-line flex items-center justify-center">
                  {getFieldIcon(field.type)}
                </div>
                <div>
                  <div className="font-bold text-xs text-ink flex items-center gap-2">
                    <span>{field.name}</span>
                    {field.required && (
                      <span className="text-[10px] font-semibold text-danger bg-red-50 px-2 py-0.5 rounded-full">
                        Required
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-muted">
                    key: <span className="text-gray-700">{field.key}</span> • type: {field.type}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDeleteField(field.id)}
                  className="p-2 rounded-lg text-gray-400 hover:text-danger hover:bg-red-50 transition-colors"
                  title="Delete field"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
