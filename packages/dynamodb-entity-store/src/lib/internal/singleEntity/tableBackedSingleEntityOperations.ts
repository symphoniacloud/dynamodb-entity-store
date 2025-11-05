import { EntityContext } from '../entityContext.js'
import {
  DeleteOptions,
  GetOptions,
  GsiQueryAllOptions,
  GsiQueryOnePageOptions,
  GsiScanAllOptions,
  GsiScanOnePageOptions,
  OnePageResponse,
  PutOptions,
  QueryAllOptions,
  QueryOnePageOptions,
  ScanAllOptions,
  ScanOnePageOptions,
  SingleEntityOperations,
  SkQueryRange,
  UpdateOptions
} from '../../singleEntityOperations.js'
import { tableBackedSingleEntityAdvancedOperations } from './tableBackedSingleEntityAdvancedOperations.js'

export function tableBackedSingleEntityOperations<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
  entityContext: EntityContext<TItem, TPKSource, TSKSource>
): SingleEntityOperations<TItem, TPKSource, TSKSource> {
  const advancedOperations = tableBackedSingleEntityAdvancedOperations(entityContext)

  return {
    advancedOperations,

    async put(item: TItem, options?: PutOptions): Promise<TItem> {
      await advancedOperations.put(item, options)
      return item
    },

    async update<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options?: UpdateOptions
    ): Promise<void> {
      await advancedOperations.update(keySource, options)
    },

    async getOrUndefined<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options?: GetOptions
    ): Promise<TItem | undefined> {
      return (await advancedOperations.getOrUndefined(keySource, options)).item
    },

    async getOrThrow<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options?: GetOptions
    ): Promise<TItem> {
      return (await advancedOperations.getOrThrow(keySource, options)).item
    },

    async delete<TKeySource extends TPKSource & TSKSource>(
      keySource: TKeySource,
      options?: DeleteOptions
    ): Promise<void> {
      await advancedOperations.delete(keySource, options)
    },

    async queryAllByPk(pkSource: TPKSource, options: QueryAllOptions = {}): Promise<TItem[]> {
      return (await advancedOperations.queryAllByPk(pkSource, options)).items
    },

    async queryOnePageByPk(
      pkSource: TPKSource,
      options: QueryOnePageOptions = {}
    ): Promise<OnePageResponse<TItem>> {
      return await advancedOperations.queryOnePageByPk(pkSource, options)
    },

    async queryAllByPkAndSk(
      pkSource: TPKSource,
      queryRange: SkQueryRange,
      options: QueryAllOptions = {}
    ): Promise<TItem[]> {
      return (await advancedOperations.queryAllByPkAndSk(pkSource, queryRange, options)).items
    },

    async queryOnePageByPkAndSk(
      pkSource: TPKSource,
      queryRange: SkQueryRange,
      options: QueryOnePageOptions = {}
    ): Promise<OnePageResponse<TItem>> {
      return await advancedOperations.queryOnePageByPkAndSk(pkSource, queryRange, options)
    },

    async queryAllWithGsiByPk<TGSIPKSource>(
      pkSource: TGSIPKSource,
      options: GsiQueryAllOptions = {}
    ): Promise<TItem[]> {
      return (await advancedOperations.queryAllWithGsiByPk(pkSource, options)).items
    },

    async queryOnePageWithGsiByPk<TGSIPKSource>(
      pkSource: TGSIPKSource,
      options: GsiQueryOnePageOptions = {}
    ): Promise<OnePageResponse<TItem>> {
      return await advancedOperations.queryOnePageWithGsiByPk(pkSource, options)
    },

    async queryAllWithGsiByPkAndSk<TGSIPKSource>(
      pkSource: TGSIPKSource,
      queryRange: SkQueryRange,
      options: GsiQueryAllOptions = {}
    ): Promise<TItem[]> {
      return (await advancedOperations.queryAllWithGsiByPkAndSk(pkSource, queryRange, options)).items
    },

    async queryOnePageWithGsiByPkAndSk<TGSIPKSource>(
      pkSource: TGSIPKSource,
      queryRange: SkQueryRange,
      options: GsiQueryOnePageOptions = {}
    ): Promise<OnePageResponse<TItem>> {
      return await advancedOperations.queryOnePageWithGsiByPkAndSk(pkSource, queryRange, options)
    },

    async scanAll(options: ScanAllOptions = {}) {
      return (await advancedOperations.scanAll(options)).items
    },

    async scanOnePage(options: ScanOnePageOptions = {}) {
      return await advancedOperations.scanOnePage(options)
    },

    async scanAllWithGsi(options: GsiScanAllOptions = {}) {
      return (await advancedOperations.scanAllWithGsi(options)).items
    },

    async scanOnePageWithGsi(options: GsiScanOnePageOptions = {}) {
      return await advancedOperations.scanOnePageWithGsi(options)
    }
  }
}
