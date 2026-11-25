"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getProducts, createProduct, updateProduct, deleteProduct, getProductStats } from "@/lib/api";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import type { Product } from "@/types/crm";
import { Plus, Search, Loader2, X, Package, IndianRupee, BarChart3 } from "lucide-react";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", code: "", description: "", unit_price: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [pR, sR] = await Promise.all([getProducts({ search: search || undefined }), getProductStats()]);
      if (pR.success && pR.data) setProducts(pR.data);
      if (sR.success && sR.data) setStats(sR.data);
    } catch {} finally { setLoading(false); }
  }, [search]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true);
    try { const r = await createProduct({ ...form, unit_price: form.unit_price ? +form.unit_price : 0 }); if (r.success && r.data) { setProducts((p) => [r.data, ...p]); resetForm(); } } catch {} finally { setSubmitting(false); }
  };

  const handleEdit = (p: Product) => { setEditingId(p.id); setForm({ name: p.name, code: p.code || "", description: p.description || "", unit_price: String(p.unit_price || "") }); setShowAdd(true); };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingId) return; setSubmitting(true);
    try { const r = await updateProduct(editingId, { ...form, unit_price: form.unit_price ? +form.unit_price : 0 }); if (r.success && r.data) { setProducts((p) => p.map((x) => x.id === editingId ? r.data : x)); resetForm(); } } catch {} finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try { await deleteProduct(id); setProducts((p) => p.filter((x) => x.id !== id)); } catch {}
  };

  const toggleActive = async (p: Product) => {
    try { const r = await updateProduct(p.id, { is_active: !p.is_active }); if (r.success && r.data) setProducts((products) => products.map((x) => x.id === p.id ? r.data : x)); } catch {}
  };

  const resetForm = () => { setShowAdd(false); setEditingId(null); setForm({ name: "", code: "", description: "", unit_price: "" }); };

  return (
    <div className="flex flex-col h-full">
      <Header title="Products" subtitle="Manage your product catalog" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {stats && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Package className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Products</p><p className="text-2xl font-bold">{stats.totalProducts}</p></div></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><BarChart3 className="h-5 w-5 text-emerald-500" /></div><div><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold">{stats.activeProducts}</p></div></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><IndianRupee className="h-5 w-5 text-amber-500" /></div><div><p className="text-sm text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p></div></CardContent></Card>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><input type="search" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-80 rounded-md border bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
          <Button size="sm" onClick={() => { resetForm(); setShowAdd(true); }}><Plus className="h-4 w-4 mr-2" />Add Product</Button>
        </div>
        <Card><CardContent className="p-0">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (
            <Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Code</TableHead><TableHead>Price</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>{products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Package className="h-4 w-4 text-primary" /></div><div><p className="font-medium">{p.name}</p>{p.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.description}</p>}</div></div></TableCell>
                  <TableCell className="text-sm font-mono">{p.code || "-"}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(p.unit_price)}</TableCell>
                  <TableCell><Badge variant={p.is_active ? "default" : "secondary"} className="text-xs">{p.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatRelativeTime(p.created_at)}</TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleEdit(p)}>Edit</Button><Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleActive(p)}>{p.is_active ? "Deactivate" : "Activate"}</Button><Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleDelete(p.id)}>Delete</Button></div></TableCell>
                </TableRow>
              ))}{products.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No products</TableCell></TableRow>}</TableBody></Table>
          )}
        </CardContent></Card>
        {showAdd && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">{editingId ? "Edit Product" : "Add Product"}</h2><Button variant="ghost" size="icon" onClick={resetForm}><X className="h-4 w-4" /></Button></div>
          <form onSubmit={editingId ? handleUpdate : handleAdd} className="space-y-4">
            <div><label className="text-sm font-medium">Name *</label><input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium">SKU/Code</label><input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div><div><label className="text-sm font-medium">Unit Price (₹)</label><input type="number" step="0.01" value={form.unit_price} onChange={(e) => setForm((p) => ({ ...p, unit_price: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm mt-1" /></div></div>
            <div><label className="text-sm font-medium">Description</label><textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm mt-1" /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={resetForm}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editingId ? "Update" : "Create"}</Button></div>
          </form>
        </div></div>}
      </div>
    </div>
  );
}
