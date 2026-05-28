"use client";

import { useMemo, useState } from "react";
import { useOfflineStore } from "@/lib/client/use-offline-store";
import { GroceryItem } from "@/lib/types";
import AddItemForm from "./AddItemForm";
import GroceryItemRow from "./GroceryItemRow";
import RegularItemsList from "./RegularItemsList";
import SyncIndicator from "./SyncIndicator";
import PullToRefresh from "./PullToRefresh";

function groupByCategory(items: GroceryItem[]): [string, GroceryItem[]][] {
  const groups: Record<string, GroceryItem[]> = {};
  for (const item of items) {
    const cat = item.category || "Other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  return Object.entries(groups)
    .map(([cat, items]) => [cat, items.sort((a, b) => a.name.localeCompare(b.name))] as [string, GroceryItem[]])
    .sort(([a], [b]) => a.localeCompare(b));
}

export default function GroceryList() {
  const store = useOfflineStore();
  const [confirmUncheckAll, setConfirmUncheckAll] = useState(false);

  const shoppingListNames = useMemo(
    () => new Set(store.groceryItems.map((i) => i.name.toLowerCase())),
    [store.groceryItems]
  );

  const handleAdd = async (name: string, quantity: number, unit: string) => {
    if (shoppingListNames.has(name.toLowerCase())) return;
    await store.addGroceryItem(name, quantity, unit);
  };

  const handleUncheckAll = () => {
    if (!confirmUncheckAll) {
      setConfirmUncheckAll(true);
      return;
    }
    store.clearAllGroceryItems();
    setConfirmUncheckAll(false);
  };

  const uncheckedItems = store.groceryItems.filter((i) => !i.checked);
  const checkedItems = store.groceryItems.filter((i) => i.checked);
  const uncheckedByCategory = groupByCategory(uncheckedItems);

  return (
    <PullToRefresh onRefresh={store.refreshFromServer} enabled={!store.hasPendingChanges && store.isOnline}>
    <div className="space-y-6">
      <SyncIndicator status={store.syncStatus} isOnline={store.isOnline} lastSynced={store.lastSynced} hasPendingChanges={store.hasPendingChanges} lastSavedBy={store.lastSavedBy} onSave={store.saveChanges} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Grocery Items checklist */}
        <section className="order-2 lg:order-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span>📋</span>
              <span>Grocery Items</span>
            </h2>
            {shoppingListNames.size > 0 && (
              <>
                {confirmUncheckAll ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Are you sure?</span>
                    <button
                      onClick={handleUncheckAll}
                      className="text-xs px-2.5 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                    >
                      Yes, uncheck all
                    </button>
                    <button
                      onClick={() => setConfirmUncheckAll(false)}
                      className="text-xs px-2.5 py-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleUncheckAll}
                    className="text-xs px-3 py-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Uncheck all
                  </button>
                )}
              </>
            )}
          </div>
          <RegularItemsList
            items={store.regularItems}
            onAddToGroceryList={store.addSelectedToGroceryList}
            onRemoveFromGroceryList={store.removeGroceryItemByName}
            onUploadCsv={store.uploadCsv}
            alreadyInList={shoppingListNames}
            onAddItem={store.addRegularItem}
            onEditItem={store.editRegularItem}
            onDeleteItem={store.deleteRegularItem}
          />
        </section>

        {/* Shopping List — sticky with bordered frame */}
        <section className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-4 flex flex-col" style={{ maxHeight: "calc(100vh - 2rem)" }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span>🛍️</span>
              <span>Shopping List</span>
            </h2>

            <AddItemForm onAdd={handleAdd} />

            {store.groceryItems.length > 0 && (
              <div className="flex items-center justify-between mt-3 mb-2">
                <p className="text-sm text-gray-500">
                  {uncheckedItems.length} item{uncheckedItems.length !== 1 ? "s" : ""} remaining
                </p>
                <div className="flex gap-3">
                  {checkedItems.length > 0 && (
                    <button
                      onClick={store.clearCheckedGroceryItems}
                      className="text-sm text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Clear checked
                    </button>
                  )}
                  <button
                    onClick={store.clearAllGroceryItems}
                    className="text-sm text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}

            {store.groceryItems.length > 0 ? (
              <div className="flex-1 min-h-0 border border-gray-200 rounded-xl bg-white overflow-y-auto px-3 py-2">
                {uncheckedByCategory.map(([category, categoryItems]) => (
                  <div key={category} className="mb-2 last:mb-0">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-1 pb-0.5">
                      {category}
                    </h4>
                    <div className="divide-y divide-gray-100">
                      {categoryItems.map((item) => (
                        <GroceryItemRow
                          key={item.id}
                          item={item}
                          onToggle={store.toggleGroceryItem}
                          onRemove={store.removeGroceryItem}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {checkedItems.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                      Checked off — click to restore
                    </h4>
                    <div className="divide-y divide-gray-100">
                      {checkedItems.map((item) => (
                        <GroceryItemRow
                          key={item.id}
                          item={item}
                          onToggle={store.toggleGroceryItem}
                          onRemove={store.removeGroceryItem}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 min-h-0 border border-gray-200 rounded-xl bg-white flex items-center justify-center">
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">🛒</div>
                  <h3 className="text-base font-medium text-gray-900 mb-1">
                    Shopping list is empty
                  </h3>
                  <p className="text-sm text-gray-500">
                    Add items manually above or tap items from your grocery list
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
    </PullToRefresh>
  );
}
