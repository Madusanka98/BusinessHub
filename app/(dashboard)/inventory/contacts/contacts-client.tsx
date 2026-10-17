"use client";

import React, { useState, useTransition } from "react";
import {
  createCustomerAction,
  updateCustomerAction,
  createSupplierAction,
  updateSupplierAction,
} from "@/modules/commerce/actions/commerce.actions";
import {
  Users2,
  Building2,
  PlusCircle,
  Edit2,
  Search,
  X,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";

interface CustomerItem {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  _count: { orders: number };
}

interface SupplierItem {
  id: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  _count: { purchases: number };
}

interface ContactsClientProps {
  customers: CustomerItem[];
  suppliers: SupplierItem[];
  canManage: boolean;
}

export function ContactsClient({
  customers,
  suppliers,
  canManage,
}: ContactsClientProps) {
  const [activeTab, setActiveTab] = useState<"customers" | "suppliers">("customers");
  const [searchTerm, setSearchTerm] = useState("");

  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);

  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createCustomerAction(null, formData);
      if (result.success) {
        setIsAddCustomerOpen(false);
      } else {
        setErrorMsg(result.error || "Failed to create customer.");
      }
    });
  };

  const handleEditCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateCustomerAction(editingCustomer.id, null, formData);
      if (result.success) {
        setEditingCustomer(null);
      } else {
        setErrorMsg(result.error || "Failed to update customer.");
      }
    });
  };

  const handleAddSupplier = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createSupplierAction(null, formData);
      if (result.success) {
        setIsAddSupplierOpen(false);
      } else {
        setErrorMsg(result.error || "Failed to create supplier.");
      }
    });
  };

  const handleEditSupplier = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSupplier) return;
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateSupplierAction(editingSupplier.id, null, formData);
      if (result.success) {
        setEditingSupplier(null);
      } else {
        setErrorMsg(result.error || "Failed to update supplier.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setActiveTab("customers")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "customers"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users2 className="w-4 h-4" />
            <span>Customers ({customers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("suppliers")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "suppliers"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Suppliers ({suppliers.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {canManage && (
            <button
              onClick={() => {
                setErrorMsg(null);
                if (activeTab === "customers") setIsAddCustomerOpen(true);
                else setIsAddSupplierOpen(true);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/30 transition-all whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{activeTab === "customers" ? "Add Customer" : "Add Supplier"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Customers */}
      {activeTab === "customers" && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold">
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4 text-center">Orders</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 6 : 5} className="py-8 text-center text-slate-500">
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">
                        {c.name}
                        {c.notes && (
                          <span className="block text-[11px] text-slate-500 font-normal">
                            {c.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 space-y-0.5">
                        {c.phone && (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>{c.email}</span>
                          </div>
                        )}
                        {!c.phone && !c.email && <span className="text-slate-600">—</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                        {c.address ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{c.address}</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
                          {c._count.orders} orders
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.isActive
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-slate-800 text-slate-500 border border-slate-700"
                          }`}
                        >
                          {c.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setErrorMsg(null);
                              setEditingCustomer(c);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Suppliers */}
      {activeTab === "suppliers" && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold">
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4 text-center">Purchases</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 7 : 6} className="py-8 text-center text-slate-500">
                      No suppliers found.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">
                        {s.name}
                        {s.notes && (
                          <span className="block text-[11px] text-slate-500 font-normal">
                            {s.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {s.contactPerson || "—"}
                      </td>
                      <td className="py-3 px-4 space-y-0.5">
                        {s.phone && (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{s.phone}</span>
                          </div>
                        )}
                        {s.email && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>{s.email}</span>
                          </div>
                        )}
                        {!s.phone && !s.email && <span className="text-slate-600">—</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                        {s.address ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{s.address}</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
                          {s._count.purchases} POs
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.isActive
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-slate-800 text-slate-500 border border-slate-700"
                          }`}
                        >
                          {s.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setErrorMsg(null);
                              setEditingSupplier(s);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddCustomerOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-base font-bold text-white mb-3">Add Customer</h2>
            {errorMsg && (
              <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}
            <form onSubmit={handleAddCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Customer Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Notes / Preferences</label>
                <textarea
                  name="notes"
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold"
                >
                  {isPending ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setEditingCustomer(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-base font-bold text-white mb-3">Edit Customer</h2>
            {errorMsg && (
              <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}
            <form onSubmit={handleEditCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Customer Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingCustomer.name}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={editingCustomer.phone || ""}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingCustomer.email || ""}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  defaultValue={editingCustomer.address || ""}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Status</label>
                <select
                  name="isActive"
                  defaultValue={editingCustomer.isActive ? "true" : "false"}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold"
                >
                  {isPending ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isAddSupplierOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddSupplierOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-base font-bold text-white mb-3">Add Supplier</h2>
            {errorMsg && (
              <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}
            <form onSubmit={handleAddSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Supplier Company Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Contact Person</label>
                <input
                  type="text"
                  name="contactPerson"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddSupplierOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold"
                >
                  {isPending ? "Saving..." : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setEditingSupplier(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-base font-bold text-white mb-3">Edit Supplier</h2>
            {errorMsg && (
              <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}
            <form onSubmit={handleEditSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Supplier Company Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingSupplier.name}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Contact Person</label>
                <input
                  type="text"
                  name="contactPerson"
                  defaultValue={editingSupplier.contactPerson || ""}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={editingSupplier.phone || ""}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingSupplier.email || ""}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  defaultValue={editingSupplier.address || ""}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Status</label>
                <select
                  name="isActive"
                  defaultValue={editingSupplier.isActive ? "true" : "false"}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold"
                >
                  {isPending ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
