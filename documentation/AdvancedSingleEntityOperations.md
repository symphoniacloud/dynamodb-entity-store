# Chapter 6 - Advanced Single Entity Operations

Back in [Chapter 3](GettingStartedWithOperations.md) I explained that Entity Store operations involving one type of Entity at a time are split into _standard_ and _advanced_ groups. In the previous chapters I covered all of the standard operations, and now it's time to cover the advanced ones.

By now you're probably pretty used to getting all of the operations for an Entity type, e.g.:

```typescript
const sheepOperations = entityStore.for(SHEEP_ENTITY)
```

The _advanced_ operations are simply a field of that:

```typescript
const advancedSheepOperations: SingleEntityAdvancedOperations<Sheep, Pick<Sheep, 'breed'>, Pick<Sheep, 'name'>> =
  entityStore.for(SHEEP_ENTITY).advancedOperations
```

`SingleEntityAdvancedOperations` contains a good number of methods! You can see all of them on the [type docs](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/SingleEntityAdvancedOperations.html).
Most of them (all but three) are "advanced" versions of those I've already covered:

* _Single item_ operations: `put()`, `getOrThrow()`, `getOrUndefined()`, `update()`, `delete()`
* Table queries and scans: `queryAllByPk()`, `queryAllByPkAndSk()`, `queryOnePageByPk()`, `queryOnePageByPkAndSk()`, `scanAll()`, `scanOnePage()`
* GSI queries and scans: `queryAllWithGsiByPk()`, `queryAllWithGsiByPkAndSk()`, `queryOnePageWithGsiByPk()`, `queryOnePageWithGsiByPkAndSk()`, `scanAllWithGsi()`, `scanOnePageWithGsi()`

There are also 3 further methods related to _batch_ operations.

In this chapter I first explain the differences of the non-batch operations versus their _standard_ equivalents, and then I cover the _batch_ operations.

## Advanced versions of standard operations

The first thing to know is that the _advanced_ operations are strictly extensions of the _standard_ operations.

The advanced versions differ in the following ways:

* The options parameter of all methods take one or more extra optional fields that define which _diagnostic metadata_ to return
  * All operations therefore return an object that contains both the actual result, and may also contain the metadata configured by the options argument. In other words `getOrThrow()`, and the query-all / scan-all collection operations don't just return the desired item(s), they return an object where the items are on a `.item` or `.items` property
* Write operations can be configured to use DynamoDB "return values"
* Collection operations may return unparsed results

> The motivation for having "standard" and "advanced" operations at all is to make the result types cleaner for the majority of use cases. It's nice not to have to keep typing `.item` or `.items` in the majority of places where data is retrieved from DynamoDB.

### Getting diagnostic metadata with results

DynamoDB offers two types of diagnostic metadata on responses:

* All operations can return [_consumed capacity_](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_ConsumedCapacity.html)
* Some operations - `put()`, `update()`, `delete()` - may return [_item collection metrics_](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_ItemCollectionMetrics.html)

DynamoDB _Entity Store_ doesn't get too involved with either of these, but some users may need this data.

To configure DynamoDB to return either/both of these types of metadata then set the [`returnConsumedCapacity`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/ReturnConsumedCapacityOption.html) and/or [`returnItemCollectionMetrics`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/ReturnItemCollectionMetricsOption.html) properties on the `options` argument of the operation method(s) you're using.
The specific settings for these fields are passed straight through to DynamoDB, so refer to the DynamoDB documentation for deciding what value to use.

If you specified either metadata option, and DynamoDB returned a relevant result, then a `.metadata` field will be on the result object, with a [`consumedCapacity`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/ConsumedCapacityMetadata.html) and/or [`itemCollectionMetrics`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/ItemCollectionMetricsMetadata.html) subfield

### Return values for write operations

DynamoDB allows requesting "return values" for write operations - `put()`, `update()`, and `delete()`.
The advanced operations allow you to request these values when using _Entity Store_ however the usual parsing / typing logic is **bypassed** and such results are provided "raw" from the DynamoDB Document Client.

To request return values you must set the [`returnValues`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/ReturnValuesOptions.html) and/or [`returnValuesOnConditionCheckFailure`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/ReturnValuesOnConditionCheckFailureOption.html) field on the options argument of the operation(s) you are calling.
The specific settings for these fields are passed straight through to DynamoDB, so refer to the DynamoDB documentation for deciding what value to use.

If you specify a return-values option, and DynamoDB returned relavant data, then an [`unparsedReturnedAttributes`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/WithUnparsedReturnedAttributes.html) field will be on the operation result object.
This contains the unparsed return values from DynamoDB.

### Unparsed results for collection requests

In [chapter 4](SingleEntityTableQueriesAndTableScans.md) you learned about DynamoDB Entity Store's _entity filtering_ behavior for queries and scans.
For the _standard_ operations Entity Store simply discards any results for entities other than those in scope.

For the _advanced_ versions of the query and scan operations Entity Store instead puts any results for other entities into a `unparsedItems` field of the operation result.
If there aren't any unparsed items this field isn't defined, but if there are it's an array of raw item results from DynamoDB.

## Batch Operations

DynamoDB allows you to perform multiple get, or write (put / delete), operations in one call.
This can improve performance of your application for certain scenarios.

DynamoDB _Entity Store_ supports batch operations in the following way:

* A batch operation can actually accept more items than can be put in a DynamoDB batch (25 items for a batch write, 100 items for a batch get). If the total number of items in the request is larger than the DynamoDB batch command size, the operation is implemented as a "batch of batches", with each batch being executed in series, and the results combined.
    * For "batch of batches" operations there is no current behavior for retry in the event of throttling
* Batch operations can be performed **for one entity type at a time** - you can't currently perform batch operations for multiple entity types in one command.
* One batch write operation can either be all puts, or all deletes, but not both
* For batch get operations the current behavior is that if any element is unparsable (e.g. because it's the incorrect entity type) then the whole command fails

### Batch Get

> I recommend you read the [AWS documentation](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchGetItem.html) first if you have not used DynamoDB Batch Gets previously

Batch gets work similarly to Entity Store's regular `get()` :

```typescript
const getResult = await sheepOperations.advancedOperations.batchGet(
  [{ breed: 'merino', name: 'shaun' }, { breed: 'merino', name: 'bob' }, { breed: 'alpaca', name: 'alison' }],
)
```

`batchGet()` has one required parameter - `keySources` . 
Each element of `keySources` follows the same rules as a single-item `get()`, so refer to [chapter 3](GettingStartedWithOperations.md) for more details.

The result of this is an object of type [`AdvancedBatchGetResponse`](https://symphoniacloud.github.io/dynamodb-entity-store/types/AdvancedBatchGetResponse.html).
The primary field on this is `items`. Each element of `items` is parsed the same way as single-item `get()`

> **Important** The order of `items` might not be the same as the order of `keySources` 

DynamoDB might not process all the elements of a batch get (see the documentation link for why).
If this happens unprocessed items are available on the `unprocessedItems` field of the result.
Note that this field is populated directly by the items that DynamoDB returned, and so it will include the generated key values, **not** the original `keySources` values.

#### Options

`batchGet()` takes an optional `options` object as the second argument, of type [`BatchGetOptions`](https://symphoniacloud.github.io/dynamodb-entity-store/types/BatchGetOptions.html). It has 3 optional properties:

* `consistentRead` - which works precisely the same as for single-item `get()`
* `returnConsumedCapacity` - whether to return consumed capacity metadata (see earlier in this chapter). If you specify this as `true` the result object will include a `metadata.consumedCapacities` property, which is an array of _ConsumedCapacity_, one for each batch call actually made (see below for when there may be more than one)
* `batchSize` - the max size of each batch call to DynamoDB. Defaults to 100.

> **IMPORTANT** the metadata subfield is `consumedCapacities`, **not** `consumedCapacity` like single-item `get()`

#### Batch of batches

If you request more than the "batch size" number of elements when using Entity Store's `batchGet()` then Entity Store will create a "batch of batches".
This batch size is 100, unless you override the `batchSize` described just now.

> There's no point setting batch size to more than 100 since that's the maximum for DynamoDB

The behavior for "batch of batches" is as follows:

* The operation request is "chunked" into several sub-batches, all but the last being of size `batchSize`
* Each sub-batch is requested from DynamoDB serially (i.e. **not** in parallel)
* All the various result elements are then combined for the result of `batchGet()`, i.e.
  * `items` contains all the parsed responses from all the sub-batches
  * `unprocessedKeys` contains all the unprocessed keys from all the sub-batches (and isn't set if there aren't any unprocessed keys at all)
  * `metadata.consumedCapacities` is an array of all capacity responses, if `returnConsumedCapacity` was set to `true`

> There's currently no "smart" behavior beyond this right now, but I could imagine extending this behavior in future. E.g. retry strategies, smarter chunking, etc.

### Batch Put

> I recommend you read the [AWS documentation](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html) first if you have not used DynamoDB Batch Gets previously

DynamoDB has a _batchWrite_ operation, but EntityStore separates this for puts and deletes. Here's how you perform a batch put: 

```typescript
const putResult = await sheepOperations.advancedOperations.batchPut([
  { breed: 'merino', name: 'shaun', ageInYears: 3 },
  { breed: 'merino', name: 'bob', ageInYears: 4 },
  { breed: 'suffolk', name: 'alison', ageInYears: 2 }
])
```

`batchPut()` has one required parameter - `items` - which is an array of the items you want to _put_ .
What is actually written for each item follows the same logic as single-item `put()`, so read [chapter 3](GettingStartedWithOperations.md) for more details.

`batchPut()`'s [result](https://symphoniacloud.github.io/dynamodb-entity-store/types/AdvancedBatchWriteResponse.html) will often be an empty object, but has two properties which may be set:

* `unprocessedItems` - any unprocessed items
* `metadata` - diagnostic metadata, if the appropriate options were set (see next)

#### Options

`batchPut()` takes an optional `options` object as the second argument, of type [`BatchPutOptions`](https://symphoniacloud.github.io/dynamodb-entity-store/types/BatchPutOptions.html) . It has the following optional properties:

* `ttl`, `ttlInFutureDays` - work the same way as for single-item `put()` when creating TTL attributes for items (you can't specify different TTL values for different elements in the batch)
* `batchSize` - the same as `batchGet()`, except the default is 25 (the maximum for DynamoDB Batch Write operations)
* `returnConsumedCapacity`, `returnItemCollectionMetrics` - whether to return diagnostic metadata

#### Batch of batches

`batchPut()` works in the same way as `batchGet()` when you specify more items than `batchSize` (which, again, defaults to the max allowed of 25), 
specifically that it creates a "batch of batches" of requests to DynamoDB.
The same rules as for `batchGet()` apply.

### Batch Delete

`batchDelete()` uses the same underlying call to DynamoDB as `batchPut()`, since both use DynamoDB's [batch write operation](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html).

As such, pretty much everything above about `batchPut()` applies to `batchDelete()`, except that it takes an array of `keySources`, like `batchGet()`.

```typescript
const deleteResult = await sheepOperations.advancedOperations.batchDelete(
  [{ breed: 'merino', name: 'shaun' }, { breed: 'merino', name: 'bob' }, { breed: 'alpaca', name: 'alison' }],
)
```

For `batchDelete()`'s options and result structure, see the type docs [here for options](https://symphoniacloud.github.io/dynamodb-entity-store/types/BatchDeleteOptions.html) and [here for result](https://symphoniacloud.github.io/dynamodb-entity-store/types/AdvancedBatchWriteResponse.html).