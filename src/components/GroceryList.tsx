"use client";

import { useMemo, useState } from "react";
import { useOfflineStore } from "@/lib/client/use-offline-store";
import AddItemForm from "./AddItemForm";
import GroceryItemRow from "./GroceryItemRow";
import RegularItemsList from "./RegularItemsList";
import SyncIndicator from "./SyncIndicator";

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

  const totalEstimate = uncheckedItems.reduce((sum, item) => {
    if (item.bestPrice) {
      return sum + item.bestPrice.price * item.quantity;
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      <SyncIndicator status={store.syncStatus} isOnline={store.isOnline} lastSynced={store.lastSynced} hasPendingChanges={store.hasPendingChanges} onSave={store.saveChanges} />

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
          />
        </section>

        {/* Shopping List — sticky in two-pane mode */}
        <section className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>🛍️</span>
              <span>Shopping List</span>
            </h2>

            <div className="space-y-4">
              <AddItemForm onAdd={handleAdd} />

              {store.groceryItems.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    {uncheckedItems.length} item{uncheckedItems.length !== 1 ? "s" : ""} remaining
                    {totalEstimate > 0 && (
                      <span className="ml-2 font-semibold text-emerald-600">
                        Est. total: ${totalEstimate.toFixed(2)}
                      </span>
                    )}
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

              <div className="space-y-2 lg:max-h-[60vh] lg:overflow-y-auto">
                {uncheckedItems.map((item) => (
                  <GroceryItemRow
                    key={item.id}
                    item={item}
                    onToggle={store.toggleGroceryItem}
                    onRemove={store.removeGroceryItem}
                  />
                ))}
              </div>

              {checkedItems.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Checked off — click to restore
                  </h3>
                  {checkedItems.map((item) => (
                    <GroceryItemRow
                      key={item.id}
                      item={item}
                      onToggle={store.toggleGroceryItem}
                      onRemove={store.removeGroceryItem}
                    />
                  ))}
                </div>
              )}

              {store.groceryItems.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">🛒</div>
                  <h3 className="text-base font-medium text-gray-900 mb-1">
                    Shopping list is empty
                  </h3>
                  <p className="text-sm text-gray-500">
                    Add items manually above or tap items from your grocery list
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
