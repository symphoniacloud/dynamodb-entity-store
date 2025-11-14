import { NativeAttributeValue } from '@aws-sdk/lib-dynamodb'

interface TableKey {
  PK: NativeAttributeValue
  SK?: NativeAttributeValue
}

export class FakeTable {
  private readonly pkName: string
  private readonly skName: string | undefined
  private readonly items: Map<TableKey, Record<string, NativeAttributeValue>> = new Map<
    TableKey,
    Record<string, NativeAttributeValue>
  >()

  constructor(pkName: string, skName: string | undefined) {
    this.pkName = pkName
    this.skName = skName
  }

  putItem(item: Record<string, NativeAttributeValue> | undefined) {
    if (!item) return
    const itemKey = this.keyFromItem(item)
    // Required because complex key type on items, and otherwise we'd get "duplicate" items
    this.items.set(this.findMatchingKey(itemKey) ?? itemKey, item)
  }

  get(key: Record<string, NativeAttributeValue> | undefined) {
    const matchingKey = this.findMatchingKey(this.keyFromItem(key))
    return matchingKey ? this.items.get(matchingKey) : undefined
  }

  deleteItem(key: Record<string, NativeAttributeValue> | undefined) {
    const matchingKey = this.findMatchingKey(this.keyFromItem(key))
    if (matchingKey) {
      this.items.delete(matchingKey)
    }
  }

  allItems() {
    return Array.from(this.items.values())
  }

  private keyFromItem(item: Record<string, NativeAttributeValue> | undefined): TableKey {
    if (!item) throw new Error('Item is undefined')
    const pkValue = item[this.pkName]
    if (!pkValue) throw new Error(`PK field [${this.pkName}] is not found`)
    if (this.skName) {
      const skValue = item[this.skName]
      if (!skValue) throw new Error(`SK field [${this.skName}] is not found`)
      return { PK: pkValue, SK: skValue }
    } else {
      return { PK: pkValue }
    }
  }

  // Required because we have a complex key on items (a Map), and Map only matches object
  // complex keys if they are the same instance
  private findMatchingKey(key: TableKey) {
    for (const tableKey of this.items.keys()) {
      if (tableKey.PK === key.PK && tableKey.SK === key.SK) return tableKey
    }
    return undefined
  }
}
