# Chapter 8 - Transactional Operations

DynamoDB transactions allow you to group multiple _actions_ into one transactional operation.
They're more limited than what some people may be used to from transactions in relational databases, but here are a couple of examples of when I've used DynamoDB transactions:

* When I want to put two related items, but I only want to put both items if both satisfy a condition check
* When I want to get two related items in a fast moving system, and know for sure that both items represented the same point in time

The AWS docs have a [section devoted to DynamoDB transactions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transactions.html) so I recommend you start with that if you're new to this area.

DynamoDB has two different types of transactional operation - `TransactWriteItems` and `TransactGetItems`.
_DynamoDB Entity Store_ supports both types.

Transactions often involve multiple types of entity, and one of the powerful aspects of DynamoDB transactional operations is that they support multiple tables in one operation. 
Because of these points _DynamoDB Entity Store_ transactional operations support multiple entities, **and** support multiple tables.

I start by explaining 'get' transactions since they're more simple, and then I move on to 'write' transactions.

## Get Transactions

Here's an example of using Entity Store's Get Transaction support:

```typescript
const entityStore = createStore(createStandardSingleTableConfig('AnimalsTable'))
const response = await store.transactions
  .buildGetTransaction(SHEEP_ENTITY)
  .get({ breed: 'merino', name: 'shaun'})
  .get({ breed: 'alpaca', name: 'alison' })
  .get({ breed: 'merino', name: 'bob' })
  .nextEntity(CHICKEN_ENTITY)
  .get({breed: 'sussex', name: 'ginger'})
  .execute()
```

Which results in an object like this:

```typescript
{
  itemsByEntityType: {
    sheep: [{ breed: 'merino', name: 'shaun', ageInYears: 3 }, null, { breed: 'merino', name: 'bob', ageInYears: 4 }]
    chicken: [{breed: 'sussex', name: 'ginger', dateOfBirth: '2021-07-01', coop: 'bristol'}]
  }
}
```

You start a get transaction by calling [`.transactions.buildGetTransaction(firstEntity)`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/TransactionOperations.html#buildGetTransaction) on the top level store object.
This provides a "builder" object that you can use to provide the item keys you want to get, and finally you call `.execute()` to execute the transaction request.

The builder object works as follows.

### First entity and `nextEntity()`

Like the single entity operations, `.buildGetTransaction()` interprets actions on an entity-by-entity basis.
In other words each of the get-actions you specify are in the context of an entity, but you can have different entities for different actions.
To kick things off you specify the entity for your first get action.

`buildGetTransaction()` takes one required parameter - an `Entity`.
Once you've specified all the get-actions for one entity you can then, if necessary, specify actions for a different entity by calling [`nextEntity()`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/GetTransactionBuilder.html#nextEntity).
This also takes one required parameter - another instance of `Entity`. 
You use the result of `nextEntity()` to add the next actions, and to add more Entity Types if necessary.

DynamoDB Entity Store transactions support multiple tables, which means a couple of things:
* You can use transactions in single or multi-table configurations
* Each of the entities you specify in one `buildGetTransaction()` operation can be for one or multiple tables

Furthermore, **unlike** the [multi-entity collection operations](QueryingAndScanningMultipleEntities.md), you aren't required to have an _entityType_ attribute on your table(s).
If your configuration works for regular single-entity `get` operations, it will work for transactional gets too.

### `.get()`

Once you've specified an entity - either the first entity when you call `.buildGetTransaction()`, or subsequent entities by calling `nextEntity()` - you specify "get-actions" in the context of **the most recently specified entity**.

Each get-action is specified by one call to [`.get()`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/GetTransactionBuilder.html#get), which takes one argument - a `keySource` used, along with the entity, to generate the key for desired object.
This uses precisely the same logic as `.getOrThrow()` or `.getOrUndefined()` as described in [chapter 3](GettingStartedWithOperations.md).

Because the library uses a builder pattern for transactions make sure to use the result of each `.get()` for whatever you do next.

DynamoDB's _TransactGetItems_ logic takes an ordered array of up to 100 get actions, and so you can specify up to 100 actions with a single call to `buildGetTransaction()`.

Further, since the list of actions is ordered then if necessary you can switch back to a previously specified entity as part of setting up a transaction.
E.g. the following call is valid:

```typescript
await store.transactions
  .buildGetTransaction(SHEEP_ENTITY)
  .get({ breed: 'merino', name: 'shaun'})
  .nextEntity(CHICKEN_ENTITY)
  .get({breed: 'sussex', name: 'ginger'})
  .nextEntity(SHEEP_ENTITY)
  .get({ breed: 'alpaca', name: 'alison' })
  .nextEntity(CHICKEN_ENTITY)
  .get({breed: 'sussex', name: 'babs'})
  .execute()
```

### `.execute()`, and response

When you've specified all the get-actions you call [`.execute()`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/GetTransactionBuilder.html#execute) to perform the operation.

`.execute()` has an optional `options` parameter, which allows you to request capacity metadata (with the `consumedCapacity` field).
This works in the same way as was described in [chapter 6](AdvancedSingleEntityOperations.md).

If `.execute()` is successful it returns an object of type [`GetTransactionResponse`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/GetTransactionResponse.html).
This has one required field - `itemsByEntityType`.
As shown in the example above, `itemsByEntityType` is a map from entity type to array of the parsed results of each get-action.
Note that the entity type comes solely from the entity object that was in scope when each action was specified - the underlying table items **do not** need an entity-type attribute.

Each array of parsed items (per entity type) is in the same order as was originally created in the `buildGetTransaction()` chain.
Further, if a particular item didn't exist in the table then it is represented in the result array with a `null`.

If you specified options on the call to `.execute()` then look for metadata on the `.metadata` field in the way described in [chapter 6](AdvancedSingleEntityOperations.md).  

## Write Transactions

Write Transactions in Entity Store work very similarly to Get Transactions.
The main differences are each action is more complicated, and there's not much interesting on the response.
Here's an example:

```typescript
const entityStore = createStore(createStandardSingleTableConfig('AnimalsTable'))
await store.transactions
  .buildWriteTransaction(SHEEP_ENTITY)
  .put({ breed: 'merino', name: 'shaun', ageInYears: 3 }, 
    { conditionExpression: 'attribute_not_exists(PK)' })
  .put({ breed: 'merino', name: 'bob', ageInYears: 4 })
  .nextEntity(CHICKEN_ENTITY)
  .put({ breed: 'sussex', name: 'ginger', dateOfBirth: '2021-07-01', coop: 'bristol' },
    { conditionExpression: 'attribute_not_exists(PK)' })
  .execute()
```

Write transactions have the same pattern as get transactions, specifically:

* Start specifying a transaction by calling `buildWriteTransaction(firstEntity)`, passing the entity for the first action
* This returns a builder-object you can use for specifying the rest of the operation
* Use action specifiers 
* Call `.nextEntity(entity)` to change the entity context for the next action(s)
* Call `.execute()` to finalize the operation, and make the request to DynamoDB

Just like get transactions, write transactions support multiple entities and multiple tables.

### Action specifiers

Each write transaction consists of an ordered list of one or more actions.
There are four different action types, each of which have their own function on the transaction builder.

* [`.put()`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/WriteTransactionBuilder.html#put)
* [`.update()`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/WriteTransactionBuilder.html#update)
* [`.delete()`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/WriteTransactionBuilder.html#delete)
* [`.conditionCheck()`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/WriteTransactionBuilder.html#conditionCheck)

`.put()`, `.update()`, `.delete()` all work in almost exactly the same way as their _standard_ single-item equivalent operations, so if in doubt see
[chapter 3](GettingStartedWithOperations.md) for what this means.

The only difference is that they can each take an additional field on their options argument - `returnValuesOnConditionCheckFailure`.
See [the AWS docs](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html#DDB-PutItem-request-ReturnValuesOnConditionCheckFailure) for an explanation. 

For transactions you'll often be using condition expressions for some / all of these actions, and expression specification works the same way for transactions as it does for single-item operations.

`.conditionCheck()` is specific for write transactions.
Its parameters are the same as those for `.delete()` with two differences:

* The second parameter - `options` - is required
* The `conditionExpression` field on the options parameter is required

DynamoDB interprets a condition check in the same way as it does a delete, except it doesn't actually make any data changes.
For more details, see the [_TransactWriteItems_ docs](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html).

### `.execute()`

[`.execute()`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/WriteTransactionBuilder.html#execute) works in mostly the same way as it does for get-expressions in that it builds the full transaction request, and makes the call to DynamoDB.

You may specify `returnConsumedCapacity` and `returnItemCollectionMetrics` fields on `.execute()`'s options to retrieve diagnostic metadata on the response.

You may also specify a write-transaction specific option - `clientRequestToken`.
This is passed to DynamoDB, and you can read more about it in the [AWS Docs](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html#API_TransactWriteItems_RequestParameters).

`.execute()` returns an empty response, unless you specify either/both of the metadata options, in which case the response will have a `.metadata` field. 

## Congratulations!

You've made it to the end of the manual! That's it, no more to see! If you have any questions [drop me a line](mailto:mike@symphonia.io), or use the issues in the GitHub project.
