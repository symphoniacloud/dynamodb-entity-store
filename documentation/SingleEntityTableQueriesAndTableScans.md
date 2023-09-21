# Chapter 4 - Table Queries and Table Scans for a Single Entity

To retrieve collections of objects from DynamoDB you perform a query or a scan. 
The target of either of these operations can be a table, or a Global Secondary Index (GSI).
This chapter describes the _standard_ versions of querying and scanning a **table** - for the GSI equivalent operations see [the next chapter](./GSIs.md). 

As for the single-item operations there are also _advanced_ versions of these operations available - see [here](AdvancedSingleEntityOperations.md). 
In brief, the _advanced_ versions allow you to retrieve any unparsed items from your request, along with diagnostic metadata. 

**Prerequisite reading** - [Getting Started With Operations](GettingStartedWithOperations.md) - at least the overview section on getting a `SingleEntityOperations` object for your entity.

## Queries

First let's look at how DynamoDB Entity Store handles queries.

`SingleEntityOperations` has four table query commands.
All of them call the underlying _query_ behavior on DynamoDB but the difference between each relates to whether you're using a Sort Key, and whether you want to get all items, or just one page.

The full signatures are as follows:

```
queryAllByPk(
  pkSource: TPKSource, 
  options?: QueryAllOptions
): Promise<TItem[]>

queryOnePageByPk(
  pkSource: TPKSource,
  options?: QueryOnePageOptions
): Promise<OnePageResponse<TItem>>

queryAllByPkAndSk(
  pkSource: TPKSource,
  queryRange: SkQueryRange,
  options?: QueryAllOptions
): Promise<TItem[]>

queryOnePageByPkAndSk(
  pkSource: TPKSource,
  queryRange: SkQueryRange,
  options?: QueryOnePageOptions
): Promise<OnePageResponse<TItem>>
```

I'll go through the most simple of these first, and then build upon that for the remaining methods.

### Query-all by Partition Key

The first of the query methods returns all items for a given partition key.

For example if we wanted to find all the merino sheep in our table we would call the following:

```typescript
const merinos: Sheep[] = await sheepOperations.queryAllByPk({ breed: 'merino' })
```

The first argument is similar to the key source for `get()`, etc., but because we only need to generate the partition key the library only actually calls `pk()` on the Entity, and so we only need to pass an object that satisfies what `pk()` requires.

`queryAllByPk`'s options is of type [`QueryAllOptions`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/QueryAllOptions.html). This has two fields, which are both passed directly to the AWS SDK:

* `scanIndexForward` - whether to return results in ascending order - defaults to true. (see [_ScanIndexForward_ in AWS docs here](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html))
* `consistentRead` - the read consistency model - defaults to false. (see [AWS docs here](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html#DDB-Query-request-ConsistentRead))

#### Entity Filtering

All Single Entity Query and Scan operations will filter results to just those of the entity in scope.
Often with queries all your results will be of the desired entity type anyway, but if you're doing some Clever Stuff with keys you might get results for multiple entities from DynamoDB, and in this case your Entity Store result will have fewer items.

Entity Filtering is particularly useful if you're performing scans since the behavior of scan is actually 'scan all of this entity type'.

Filtering is performed using the `entityType` field in your Table Configuration (default attribute name = `_et`). If your table doesn't have an `entityType` configured then no filtering will occur. This is fine if your table only contains one entity type, but if it contains multiple types then any query or scan that result in items of different types being returned from DynamoDB will likely cause errors to be thrown during result parsing, described in the next section.

#### Query-all behavior and return type

DynamoDB, like many AWS APIs, provides a _paged_ interface.
Usually this is a good idea since it avoids nasty surprises both regarding memory and cost explosions.

However sometimes it's kind of a pain in the neck.
DynamoDB will return at most 1MB of data for a query, and you may well know that you've got 5MB, and darn-it why can't you just get all the results in one go?

This is where the query-all methods in DynamoDB Entity Store help.
`queryAllByPk`, and its siblings, will automatically perform pagination on your behalf until all results have been returned.
Great! Just what we've all always wanted!
But there's a **BIG WARNING** here : if you've made a mistake, and there are in fact 10 GB of results, then DynamoDB Entity Store query-all methods will try to retrieve all of those results before returning.
In other words **DON'T USE QUERY-ALL UNLESS YOU'RE CERTAIN ABOUT THE EXPECTED NUMBER OF RETURNED ITEMS!**

The Query-All _standard_ methods have another nice benefit - the return type is simply the list of resulting items.
These are all parsed in precisely the same way as for `get()` described in [the previous chapter](GettingStartedWithOperations.md), in other words see `.parse()` in [Entities](./Entities.md).
This is possible because of the _Entity Filtering_ behavior described above.

### Query-one-page by Partition Key

Maybe I scared you off with all the warnings above about query-all and you, quite sensibly, want to query just a page at a time.
That's where the query-one-page versions of the query methods come in.

Before proceeding if you don't know how DynamoDB pagination works you'll probably want to read [the AWS docs](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Pagination.html).
For example, results aren't page-numbered, or saved in DynamoDB, and you can't go backwards.
Instead to get all pages, apart from the first page, you provide the key of the last element returned on the previous page and DynamoDB calculates just-in-time what the next page evaluates to.

`queryOnePageByPk` takes an optional argument of type [`QueryOnePageOptions`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/QueryOnePageOptions.html).
This has the following optional properties:

* `limit` - the maximum number of items to _evaluate_. What does _evaluate_ mean? Well, often it means the maximum number of items to return, but it's complicated. :) See [the AWS docs](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html#API_Query_RequestParameters).
* `exclusiveStartKey` - The key of the first item to read. More on that in a moment. If you are requesting the first page, leave as undefined.
* `scanIndexForward` - same as for `QueryAllOptions`
* `consistentRead` - same as for `QueryAllOptions`

Let's look at an example. Say we have 2 merino sheep in our table.
We can run the following to just get one sheep at a time back from DynamoDB, by specifying the `limit` option with `queryOnePageByPk`:

```typescript
const result = await sheepOperations.queryOnePageByPk({ breed: 'merino' }, { limit: 1 })
```

> You don't need to specify a `limit` - if you don't DynamoDB will return up to 1MB of results. I'm just specifying it here for clarity of example.

This time the result isn't simply a list of items, it's an object of type [`OnePageResponse<TItem>`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/OnePageResponse.html).
This has two fields:

* `items: TItem[]` - the parsed list of results for this page, using the same parsing rules as query-all methods
* `lastEvaluatedKey?: DynamoDBValues` - The `LastEvaluatedKey` returned by DynamoDB, if one was returned.

In our example `result` might look like:
```
{
  items: [{ breed: 'merino', name: 'bob', ageInYears: 4 }],
  lastEvaluatedKey: {
    PK: 'SHEEP#BREED#merino',
    SK: 'NAME#bob'
  }  
}
```

If you've read the AWS query docs you'll know that if `lastEvaluatedKey` is set there are more pages to query, and if not you're all done.

> **Important** - you may get zero items returned even if there are more pages, so always look to see if `lastEvaluatedKey` exists to know whether you are done. This will be the case if _Entity Filtering_ (see earlier section) is removing results for entity types other than that in the current scope.

If there _are_ more pages to query we can re-run `queryOnePageByPk`, this time specifying `exclusiveStartKey`, using `lastEvaluatedKey` from the previous result:

```typescript
const resultTwo = await sheepOperations.queryOnePageByPk({ breed: 'merino' }, { limit: 1, exclusiveStartKey: result.lastEvaluatedKey })
```

Typically you'll either (a) do this in a loop until you've got as many results as you want and/or (b) return the page(s) of results, plus
an "externalized" version of `lastEvaluatedKey`.
E.g. you may want to run `JSON.stringify()` on lastEvaluatedKey and return it in an API call (as long as you don't mind exposing your internal key format).
If you do this remember to "de-externalize" the key before using it as `exclusiveStartKey` for the next page - in this example running `JSON.parse()`.

### Query-all by Partition Key and Sort Key

A lot of the power of using DynamoDB comes from using the Sort Key as part of a query.
`queryAllByPkAndSk` returns all the results available for when we specify both the Partition Key, and a Sort Key _range_.

`queryAllByPkAndSk` takes the same `pkSource` and optional `options` arguments as `queryAllByPk` but it also takes a required `queryRange` argument of type `SkQueryRange` :

```typescript
interface SkQueryRange {
  skConditionExpressionClause: string
  expressionAttributeValues?: DynamoDBValues
  expressionAttributeNames?: Record<string, string>
}
```

The underlying DynamoDB library takes a [_KeyConditionExpression_](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html#API_Query_RequestParameters) value.
When querying by Partition Key and Sort Key this is of the form `pk-clause AND sk-clause`.
DynamoDB Entity Store generates the `pk-clause` part, so you just need to specify the `sk-clause` part, which is what goes in `skConditionExpressionClause`.

Typically you'll want to specify the SK clause without actually using the Sort Key partition name - because that's configured in table configuration.
To do this use the `#sk` expression attribute name in the clause, and this will automatically be populated in `expressionAttributeNames` for you.

In building your SK clause you'll often want to specify other `expressionAttributeValues` and `expressionAttributeNames`, and these are
optional properties of `SkQueryRange`.

Here's an example.
Say we want to find all sheep of a particular breed, but also where `name` starts in the first half of the alphabet. We can run this:

```typescript
const earlyAlphabetMerinos = await sheepOperations.queryAllByPkAndSk(
  { breed: 'merino' },
  {
    skConditionExpressionClause: '#sk BETWEEN :from AND :to',
    expressionAttributeValues: {
      ':from': 'NAME#a',
      ':to': 'NAME#n'
    }
  }
)
```

If we turn on the console logger (see _Specifying a logger_ in [Setup](Setup.md)), we can see the actual command that DynamoDBEntity Store is running:

```
DynamoDB Entity Store DEBUG - Attempting to query or scan entity sheep [{"useAllPageOperation":true,"operationParams":{"TableName":"AnimalsTable","KeyConditionExpression":"PK = :pk and #sk BETWEEN :from AND :to","ExpressionAttributeValues":{":pk":"SHEEP#BREED#merino",":from":"NAME#a",":to":"NAME#n"},"ExpressionAttributeNames":{"#sk":"SK"}}}]
```

To clarify, here are the params being passed to the AWS SDK's `query` command:

```json
{
  "TableName": "AnimalsTable",
  "KeyConditionExpression": "PK = :pk and #sk BETWEEN :from AND :to",
  "ExpressionAttributeValues": {
    ":pk":"SHEEP#BREED#merino",
    ":from":"NAME#a",
    ":to":"NAME#n"
  },
  "ExpressionAttributeNames": {
    "#sk": "SK"
  }
}
```

* `KeyConditionExpression` includes the automatically generated PK clause (`PK = :pk`), and the SK clause we specified in code.
* `ExpressionAttributeValues` includes both the generated PK value (used by calling `pk()` on `SHEEP_ENTITY`) and the values we specified.
* `ExpressionAttributeNames` defines the name of sort key attribute, so that we don't need to know it in our business logic code.

There are a lot of common "patterns" for query range, which use the various sort key "comparison operators", described [here](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html#Query.KeyConditionExpressions).
Some of these patterns defined as "helper functions" in [_querySupport.ts_](https://github.com/symphoniacloud/dynamodb-entity-store/blob/main/src/lib/support/querySupport.ts), for example we can change our query above to the following:

```typescript
const earlyAlphabetMerinos = await sheepOperations.queryAllByPkAndSk(
  { breed: 'merino' },
  rangeWhereSkBetween('NAME#a', 'NAME#n')
)
```

At present that's all that DynamoDB Entity Store will do to help you with SK queries, however one further recommendation I have is to re-use your own `sk()` method from your entity. For example I can define the following function:

```typescript
export function rangeWhereSheepNameBetween(start: string, end: string) {
  return rangeWhereSkBetween(SHEEP_ENTITY.sk({ name: start }), SHEEP_ENTITY.sk({ name: end }))
}
```

and then my query can become:

```typescript
const earlyAlphabetMerinos = await sheepOperations.queryAllByPkAndSk(
  { breed: 'merino' },
  rangeWhereSheepNameBetween('a', 'n')
)
```

It's a small thing, but if you have a few different query types for the same entity then it can reduce some headaches.

### Query-one-page by Partition Key and Sort Key

The final table query operation is the single-page version of querying with a sort key.
`queryOnePageByPkAndSk` combines the single-page behavior of `queryOnePageByPk` with the sort-key capabilities of `queryAllByPkAndSk`.

So if we wanted to get just the first page of the query from previous section we could write the following:

```typescript
const earlyAlphabetMerinosPageOne = await sheepOperations.queryOnePageByPkAndSk(
  { breed: 'merino' },
  rangeWhereSheepNameBetween('a', 'n')
)
```

The returned value is of exactly the same form as `queryOnePageByPk`, including the `lastEvaluatedKey` field, which can be used on subsequent calls to `queryOnePageByPkAndSk`, e.g.:

```typescript
const earlyAlphabetMerinosPageTwo = await sheepOperations.queryOnePageByPkAndSk(
  { breed: 'merino' },
  rangeWhereSheepNameBetween('a', 'n'),
  {
    exclusiveStartKey: earlyAlphabetMerinosPageOne.lastEvaluatedKey
  }
)
```

Just like `queryOnePageByPk`, `queryOnePageByPkAndSk` can take a `limit` value in the `options` argument.

## Scans

Table scans are usually a terrible idea for "standard" single-table designs, and by default Entity Store will throw an error if you try! E.g.:

```typescript
for (const sheep of await sheepOperations.scanAll()) {
  console.log(`Name: ${sheep.name}`)
}
```

results in:

```
Error: Scan operations are disabled for this store
```

However you might want to use scans because of a few different reasons:

* You're using a table-per-entity design, and you want to get all items without a query
* You're using single-table-design, but you know your table is small, and want to get all items of one entity without having to support it via a query
* You're performing maintenance (e.g. a data-structure migration) and want to access your table in a way not supported by the key structures

Whatever the reason, DynamoDB Entity Store will happily support you in your scanning, as long as you enable it during setup. E.g. to change how our `Animals` store is configured:

```typescript
const entityStore = createStore({
  ...createStandardSingleTableConfig('AnimalsTable'),
  allowScans: true
})
```

A nice aspect of how DynamoDB Entity Store performs scans is that because of _Entity Filtering_ (described earlier), the result of a scan only includes items in the current entity's scope.
For example if we're storing both sheep and chickens in our Animals table the result of `sheepOperations.scanAll()` is only the sheep in the table.

`SingleEntityOperations` has two table scan commands:

```
scanAll(options?: ScanAllOptions): Promise<TItem[]>

scanOnePage(options?: ScanOnePageOptions): Promise<OnePageResponse<TItem>>
```

If you've read the section previously on queries you can probably guess what's coming, but here's what each of these do.

### Scan all

`scanAll()` returns all of the items in the entity's table that are of the entity's type.
Parsing occurs just as it does for queries.

You should **only** use this command if you're happy to read your entire table! That's because even though the result only includes items of the current entity's type the filtering occurs in **your application, NOT in DynamoDB**, and so the entire table's contents will be downloaded.

`scanAll()`'s `options` only includes one parameter - `consistentRead`, which is [described in the AWS docs here](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html#DDB-Scan-request-ConsistentRead).

### Scan one page

`scanOnePage()` returns a page of results, rather than the entire table.

Paging works in exactly the same as for querying, so read the _Query-one-page by Partition Key_ section above if you haven't done so already.

`scanOnePage()`'s options are of the following type:

```typescript
interface ScanOnePageOptions {
  limit?: number
  exclusiveStartKey?: DynamoDBValues
  consistentRead?: boolean
}
```

`limit` and `exclusiveStartKey` work exactly as described above for `queryOnePageByPk()`.
`consistentRead` works the same as it does for `scanAll()`.

The result type of `scanOnePage()` is also the same as for `queryOnePageByPk()` - the list of parsed items for the current page, and the `lastExclusiveKey` value if more pages are available.

If your table contains multiple entities then because of _Entity Filtering_ it's quite possible that a page might be empty, and yet more results are available. In other words you should rely **solely** on whether `lastExclusiveKey` is set in order to determine whether more results might be available by making further calls.

## Next up - GSIs

In this chapter you learned how to retrieve collections of items from your tables. The [next chapter](GSIs.md) explains how to do the same thing but for Global Secondary Indexes.