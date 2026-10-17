"use client";

import React, { useState, useActionState } from "react";
import { recordTransactionAction } from "@/modules/finance/actions/finance.actions";
import { TransactionType, PaymentMethod } from "@prisma/client";
import { PlusCircle, Loader2, X, Receipt, CheckCircle2 } from "lucide-react";
import { ActionResult } from "@/modules/core-tenancy/actions/business.actions";

interface CategoryOption {
  id: string;
  name: string;
  type: TransactionType;
}

interface RecordTransactionModalProps {
  categories: CategoryOption[];
  expenseThreshold: number;
}

const initialState: ActionResult = { success: false };

export function RecordTransactionModal({ categories, expenseThreshold }: RecordTransactionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [txType, setTxType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [state, formAction, isPending] = useActionState(recordTransactionAction, initialState);

  React.useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        setIsOpen(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const filteredCategories = categories.filter((c) => c.type === txType);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-colors cursor-pointer"
      >
        <PlusCircle className="w-4 h-4" />
        <span>Record Transaction</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Record Financial Entry</h3>
                  <p className="text-xs text-slate-400">Income or production expense entry.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form action={formAction} className="space-y-4 pt-4">
              {state.error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {state.error}
                </div>
              )}

              {state.success && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Transaction recorded successfully!</span>
                </div>
              )}

              {/* Transaction Type Radio Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                      txType === TransactionType.EXPENSE
                        ? "bg-rose-500/15 border-rose-500/40 text-rose-400"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value="EXPENSE"
                      checked={txType === TransactionType.EXPENSE}
                      onChange={() => setTxType(TransactionType.EXPENSE)}
                      className="sr-only"
                    />
                    <span>Operating Expense</span>
                  </label>

                  <label
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                      txType === TransactionType.INCOME
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value="INCOME"
                      checked={txType === TransactionType.INCOME}
                      onChange={() => setTxType(TransactionType.INCOME)}
                      className="sr-only"
                    />
                    <span>Revenue / Income</span>
                  </label>
                </div>
              </div>

              {/* Category Dropdown */}
              <div>
                <label htmlFor="categoryId" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Category <span className="text-rose-400">*</span>
                </label>
                <select
                  id="categoryId"
                  name="categoryId"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Select Category...</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount and Payment Method */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="amount" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Amount <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    id="amount"
                    name="amount"
                    required
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                  {txType === TransactionType.EXPENSE && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Expenses over {expenseThreshold} require owner sign-off.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="paymentMethod" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Payment Method
                  </label>
                  <select
                    id="paymentMethod"
                    name="paymentMethod"
                    defaultValue="CASH"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CREDIT_CARD">Credit / Debit Card</option>
                    <option value="MOBILE_PAYMENT">Mobile / Digital Wallet</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Transaction Date */}
              <div>
                <label htmlFor="transactionDate" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  id="transactionDate"
                  name="transactionDate"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Description <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  required
                  placeholder="e.g. 50kg Sawdust bags for Batch #104"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Receipt Reference URL */}
              <div>
                <label htmlFor="receiptUrl" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Receipt / Invoice URL <span className="text-slate-500">(Optional)</span>
                </label>
                <input
                  type="url"
                  id="receiptUrl"
                  name="receiptUrl"
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Posting...</span>
                    </>
                  ) : (
                    <span>Record Entry</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
