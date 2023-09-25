# Chapter 3 - Getting started with operations

**Prerequisite reading** - [Entities](./Entities.md) and [Setup](./Setup.md).

Once you've defined your _Entities_ and instantiated a store you can start performing operations on your tables.

The top-level interface of your store instance is `AllEntitiesStore`:

```typescript
interface AllEntitiesStore {
  for<TItem extends TPKSource & TSKSource, TPKSource, TSKSource>(
    entity: Entity<TItem, TPKSource, TSKSource>
  ): SingleEntityOperations<TItem, TPKSource, TSKSource>

  forMultiple(entities: Entity<any, any, any>[]): MultipleEntityOperations

  transactions: TransactionOperations
}
```

There are three methods on this interface to match the three top-level groupings of operations you can perform:

* Operations on one type on entity
* Operations on multiple types of entity
* Transactional operations (single or multiple entities)

Single Entity Operations themselves are divided into two sub-groups - _standard_ operations and _advanced_ operations.
_Advanced_ operations actually duplicate everything in the _Standard_ operations, but include extra operations (batch commands) plus also allow returning extra information, such as diagnostic data and original item values.

## Standard Single Entity Operations

All of the _standard_ single entity operations are available from the result of calling `.for()` on your entity store object.

For example let's say we want to perform operations on the _Sheep Entity_ I created at the end of [Chapter 1](./Entities.md). To do this I call:

```typescript
const sheepOperations = entityStore.for(SHEEP_ENTITY)
```

`sheepOperations` is implicitly of type `SingleEntityOperations<Sheep, Pick<Sheep, 'breed'>, Pick<Sheep, 'name'>>`.

The resulting operations object contains within it the table name to be used for all subsequent operations.
The table name is defined within the table configuration you used during [Setup](./Setup.md).
If you have a single-_table_ configuration then the same table name will be used whatever Entity you use.
If you have a multi-table configuration then the table name will either be the explicitly mapped table you used for your Entity's _type_ in the table configuration, or if the library can't find that type then the default table will be used if one was configured - otherwise an error will be thrown when you call `for()`.

`SingleEntityOperations` contains a number of methods, but to summarize they are:

* `put()`
* `get..()` (two different flavors)
* `update()`
* `delete()`
* `query...()` (multiple flavors)
* `scan...()` (multiple flavors)

All of these methods take typing queues from the Entity that was used when calling `for()`, so for example `put()` in the context of our `sheepOperations` is actually `put(item: Sheep, options?: PutOptions): Promise<Sheep>`.

All of these methods use the underlying behavior from the AWS API and SDK. So if there's something missing here from this document you should refer to the [AWS SDK Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/) or alternatively the [DynamoDB Developer Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithDynamo.html).

All of these methods are `async` / return promises since they call DynamoDB.

You may be wondering whether you should store your operations object - `sheepOperations` in this example - like you would a database connection.
Unlike creating the actual store, which might include setting up the DynamoDB connection details, calling `for()` is fairly cheap, computationally.
Therefore whether you store it in a variable, or just call it every time you need it, is up to you. My style is that if I'm performing
several operations against one entity in one method then I'll probably capture the operations object, otherwise I'll just call `for()` every time I need to perform an operation.

In this chapter I describe _standard_ single entity, **single item**, operations - **put**, **get**, **update**, and **delete**.
Queries and Scans are described in the following two chapters - [here for table operations](SingleEntityTableQueriesAndTableScans.md), and [here for GSI operations](GSIs.md). 

## Error Handling

Before we get to the operations - a note on error handling.
_DynamoDB Entity Store_ doesn't catch any errors thrown by the DynamoDB document client.
So if an operation fails for any reason when it reaches DynamoDB - whether it's a temporary error or not - then that error will propagate up to your own code.

_DynamoDB Entity Store_ also throws its own errors for some scenarios if your code makes an invalid request, but you shouldn't assume that _Entity Store_ does any validation for arguments that it passes through to the Document Client library. 

A particular place where this may cause problems is for batch operations with very large requests.
_Entity Store's_ batch commands (see [Chapter 6](AdvancedSingleEntityOperations.md)) can make many requests to DynamoDB in quick succession, e.g. if you make a request with 10000 items.
In this situation DynamoDB may fail with a throttling error, and this will result in an error that gets thrown to your code.
However, you would not be able to tell (with batch commands as they are currently implemented) how much of your larger request, if any, had actually been successful. 

## Put

The first operation to cover is `.put()`, or more fully:

```
put(item: TItem, options?: PutOptions): Promise<TItem>
```

Let's store some sheep:

```typescript
const sheepOperations = entityStore.for(SHEEP_ENTITY)
await sheepOperations.put({ breed: 'merino', name: 'shaun', ageInYears: 3 })
await sheepOperations.put({ breed: 'merino', name: 'bob', ageInYears: 4 })
await sheepOperations.put({ breed: 'suffolk', name: 'alison', ageInYears: 2 })
```

Now our DynamoDB table contains the following records, assuming the "standard" table configuration described in [Setup](./Setup.md):

| `PK`                  | `SK`          | `breed`   | `name`   | `ageInYears` | `_et`   | `_lastUpdated`             |
|-----------------------|---------------|-----------|----------|--------------|---------|----------------------------|
| `SHEEP#BREED#merino`  | `NAME#shaun`  | `merino`  | `shaun`  | 3            | `sheep` | `2023-08-21T15:41:53.566Z` |
| `SHEEP#BREED#merino`  | `NAME#bob`    | `merino`  | `bob`    | 4            | `sheep` | `2023-08-21T15:41:53.956Z` |
| `SHEEP#BREED#suffolk` | `NAME#alison` | `suffolk` | `alison` | 2            | `sheep` | `2023-08-21T15:41:53.982Z` |

What's going on here is that Entity Store is calling `put` on the underlying DynamoDB table for each sheep.
Each DynamoDB record includes all the fields on `Sheep`, **along with the following extra fields**:

* `PK` - generated by calling `SHEEP_ENTITY.pk(...)` for each sheep
* `SK` - generated by calling `SHEEP_ENTITY.sk(...)` for each sheep
* `_et` - the value of `SHEEP_ENTITY.type`
* `_lastUpdated` - the current date-time

There are a number of ways that this behavior can be altered.

* To change any of the attribute names for fields generated by DynamoDB Entity Store, modify the `metaAttributeNames` field of the table configuration during [setup](Setup.md).
* Similarly to disable any meta attributes from being written (apart from partition key, which is mandatory), then don't define that attribute within your `metaAttributeNames` field in the table configuration.
* To change what "data" fields are written, or how they are written, then override the `convertToDynamoFormat()` method on your entity (described in [Entities](./Entities.md)).

### Put options

`.put()` takes an optional second argument, of type [`PutOptions`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/PutOptions.html) .
Three items on this interface - `conditionExpression`, `expressionAttributeValues`, and `expressionAttributeNames` are passed straight through to the AWS SDK and you can read about them in the [AWS docs](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html#API_PutItem_RequestParameters).

There are two other fields and they are for [DynamoDB Time to Live (TTL)](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/howitworks-ttl.html) - `ttl` and `ttlInFutureDays` .
If you configure a `ttl` field in the `metaAttributeNames` field of the table configuration (which by default is set to `ttl` in the "standard" configuration), and specify either `ttl` or `ttlInFutureDays` in `options` when you call `.put()` then DynamoDB Entity store will write a TTL value along with the rest of your item.
The difference between the two are:

* `ttl` : sets an absolute given value on the item with no modification
* `ttlInFutureDays` : sets TTL value on the item with a relative value - now + number of days in the future. This uses the `clock` object in the store context (see [Setup](./Setup.md)) so if you need to override this value for automated testing then you can. DynamoDB only guarantees TTL cleanup precision within a few days, so more precision here is unnecessary.

Note - if `ttl` is set in options then any value also set for `ttlInFutureDays` is ignored.

### Put return value

The return value of `.put()` is simply the item passed in. This can be useful for making code a little cleaner.

If you need the [AWS API version of what `put` returns](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html#API_PutItem_ResponseElements) then you should the [_advanced_ version of put](./AdvancedSingleEntityOperations.md).

## Get

The two methods for get-ting items both call [_GetItem_](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_GetItem.html) under the covers and both have the same parameters.
The difference between is what happens if the item doesn't exist.
I'll get onto that below when I cover the return value.

First, the signatures:

```
getOrUndefined<TKeySource extends TPKSource & TSKSource>(
  keySource: TKeySource,
  options?: GetOptions
): Promise<TItem | undefined>

getOrThrow<TKeySource extends TPKSource & TSKSource>(
  keySource: TKeySource,
  options?: GetOptions
): Promise<TItem>
```

`keySource` is a value that can be used to generate the partition key and sort key (if you have one on your table) - this item key
is what's necessary when calling DynamoDB.

Going back to our Sheep example: in [Entities](./Entities.md) I defined `SHEEP_ENTITY` as `Entity<Sheep, Pick<Sheep, 'breed'>, Pick<Sheep, 'name'>>`.
What this means is that for `sheepOperations` the type of `keySource` is:

```typescript
type SheepKeySource = {
  breed: string,
  name: string
}
```

Therefore to retrieve the sheep named `shaun` of breed `merino` I call:

```typescript
const shaun: Sheep = await sheepOperations.getOrThrow({ breed: 'merino', name: 'shaun' })
```

DynamoDB Entity Store uses this key source - along with the `pk()` and `sk()` methods on your Entity - to generate the actual key used when calling DynamoDB.

`keySource` can include more fields than necessary.
E.g. you might already have a complete item, and you just want to see if it already exists in the table.
In such a case you can pass the full item in for `keySource` and only the relevant fields will be used to calculate the actual table key.

### Get options

For the _standard_ operations `GetOptions` has one optional field - `consistentRead` - which is passed directly to the SDK.
For more details [read the AWS documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html).

### Get return value

If the item for the given key is found then the library will return the _parsed_ version of the item.
For more details see `.parse()` in [Entities](./Entities.md).

This is a key benefit of using DynamoDB Entity Store over the AWS SDK, when using TypeScript - this library's version
of `get`, and all operations that read items from tables, return the correctly typed response. Whether this
is valid at runtime or not depends on the type predicate you defined in your _Entity_ - so make sure to put thought into that!

If the item is **not** found the behavior depends on which flavor of `get` you used. Not surprisingly:

* `getOrUndefined()` returns `undefined` if the item isn't found
* `getOrThrow()` throws an error if the item isn't found.

The reason for having both methods is that it helps a lot with type-based code when you want to throw an error when the item doesn't exist.

## Update

Updates in DynamoDB are a little odd because you need to understand [update expressions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html).
Frankly I try to use updates as infrequently as possible, and if I want to replace an item I'll often just use `put()`.
Occasionally though updates are useful.
But I recommend you read up on DynamoDB updates in general before you try to use them with this library!

Update in the _standard_ operations is defined as follows:

```
update<TKeySource extends TPKSource & TSKSource>(
  keySource: TKeySource,
  options: UpdateOptions
): Promise<void>
```

`keySource` is precisely the same as for the `get` operations just described, and the return value (for this _standard_ version) is `Promise<void>`, so the only 
part to explain here is options.

### Update options

`UpdateOptions` is the following type:

```typescript
interface UpdateOptions {
  update?: {
    set?: string
    remove?: string
    add?: string
    delete?: string
  }

  conditionExpression?: string
  expressionAttributeValues?: DynamoDBValues
  expressionAttributeNames?: Record<string, string>
  ttl?: number
  ttlInFutureDays?: number
}
```

All DynamoDB updates take an [update expression](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html).
Update expressions consist of one to four _clauses_ - _set_, _remove_, _add_, _delete_ . When using the AWS libraries these clauses are all combined into one string.
DynamoDB Entity Store instead takes these four clauses separately, and then combines them for you.
That's because if you're using either the automatic "last updated", or ttl, attributes (given the same rules as for `put()` described earlier) then the library will automatically create the _set_ sub-clauses for those values.

In certain situations you might **only** want to update the "last updated" and/or ttl values. Because of this the `update` field of `UpdateOptions` is optional.

`conditionExpression` is passed [directly through to DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html).

`expressionAttributeNames` and `expressionAttributeValues` are also passed directly through, but it's important to note that these fields can contain expression attributes for either or both of your update or condition expression.

Here's an example of using `update()` with Sheep that updates both the `ageInYears` attribute, and **also, implicitly** the `_lastUpdated` attribute:

```typescript
await sheepOperations.update({ breed: 'merino', name: 'shaun' }, {
  update: {
    set: 'ageInYears = :newAge'
  },
  expressionAttributeValues: {
    ':newAge': 4
  }
})
```

Or a minimal example that only updates the `_lastUpdated` field:

```typescript
await sheepOperations.update({ breed: 'merino', name: 'shaun' })
```

Finally - `ttl` and `ttlInFutureDays` have the same behavior as for `put()`, described earlier.

## Delete

The final _single item_ operation is `delete()` : 

```
delete<TKeySource extends TPKSource & TSKSource>(
  keySource: TKeySource,
  options?: DeleteOptions
): Promise<void>
```

`keySource` is precisely the same as for the `get` operations described earlier, and the return value for this _standard_ version of the operation is `Promise<void>`.

Here's an example:

```typescript
await sheepOperations.delete({ breed: 'merino', name: 'shaun' })
```

### Delete options

[`DeleteOptions`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/DeleteOptions.html) has three optional fields - `conditionExpression`, `expressionAttributeValues`, and `expressionAttributeNames`.
As with the other operations described so far these are just passed through to the SDK.

## Next up - collections

You now know enough to work with single items at a time. However usually you're going to want to retrieve collections of items from your tables too - that's described [in the next chapter](SingleEntityTableQueriesAndTableScans.md).
