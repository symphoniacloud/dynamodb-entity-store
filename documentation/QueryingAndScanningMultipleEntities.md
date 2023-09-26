# Chapter 7 - Querying and Scanning Multiple Entities

Up until this point everything that you've learned covers operations that use one entity at a time.
Even the batch operations described in the [last chapter](AdvancedSingleEntityOperations.md) only (currently) work for one entity per request.

For my work with DynamoDB such single-entity functionality covers the vast amount of what I need.
Sometimes, though, I want to get items for multiple entities in one go.

DynamoDB Entity Store supports this in two ways:
- Querying & scanning lets you retrieve collections of items of multiple entities based on key criteria (or the entire table)
- Transactions let you get individual items of multiple entities in one operation

This chapter covers querying and scanning multiple entities, and the [next chapter](TransactionalOperations.md) covers transactions.

## Querying multiple entities in one operation

I use multiple-entity operations when I've set up my keys so that one query will retrieve items for multiple types of entity - a technique often used for more advanced "single table design" scenarios.

Let's start with an example of this.
Say that we have two entities - chickens (which I showed in the GSI example), and ducks.

Chickens have the following table and GSI key structures:

* PK: `CHICKEN#BREED#${breed}`
* SK: `DATEOFBIRTH#${dateOfBirth}#NAME#${name}`
* GSIPK: `COOP#${coop}`
* GSISK: `CHICKEN#BREED#${breed}#DATEOFBIRTH#${dateOfBirth}`

and ducks look like this:

* PK: `DUCK#BREED#${breed}`
* SK: `YEAROFBIRTH#${yearOfBirth}#NAME#${name}`
* GSIPK: `COOP#${coop}`
* GSISK: `DUCK#BREED#${breed}#YEAROFBIRTH#${yearOfBirth}`

In a table they might look as follows:

| `PK`                   | `SK`                                 | `GSIPK`        | `GSISK`                                       | `breed`   | `name`    | `dateOfBirth` | `yearOfBirth` | `coop`    | `_et`     | `_lastUpdated`             |
|------------------------|--------------------------------------|----------------|-----------------------------------------------|-----------|-----------|---------------|---------------|-----------|-----------|----------------------------|
| `CHICKEN#BREED#sussex` | `DATEOFBIRTH#2021-07-01#NAME#ginger` | `COOP#bristol` | `CHICKEN#BREED#sussex#DATEOFBIRTH#2021-07-01` | `sussex`  | `ginger`  | `2021-07-01`  |               | `bristol` | `chicken` | `2023-08-21T15:41:53.566Z` |
| `DUCK#BREED#mallard`   | `YEAROFBIRTH#2021#NAME#waddles`      | `COOP#bristol` | `DUCK#BREED#mallard#YEAROFBIRTH#2021`         | `mallard` | `waddles` |               | `2021`        | `bristol` | `duck`    | `2023-08-21T15:42:53.116Z` |

Notice both entities have the same format for `GSIPK` - `COOP#${coop}`. 

Because of this design I can query the GSI by PK and retrieve both chickens **and** ducks in one request.
In other words I can find all the animals that are in the the coop `bristol`.
I can do this because chickens and ducks share a GSI PK format, even though they have different table key formats, GSI SK formats, and different detail attributes.

Everything you've seen so far used the `for(entity)` method on the top-level [`AllEntitiesStore`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/AllEntitiesStore.html), but that only takes one entity.
We're now in multi-entity land, and we need a different top-level function from our store: `forMultiple(entities)`.

A query to get all the animals in the `bristol` coop looks as follows:

```typescript
// Create the entity store as usual
const entityStore = createStore(createStandardSingleTableConfig('AnimalsTable'))

// Query all chickens and ducks
const animalsInBristol = await entityStore
  .forMultiple([CHICKEN_ENTITY, DUCK_ENTITY])
  .queryAllWithGsiByPk(CHICKEN_ENTITY, { coop: 'bristol' })
```

In the case of our table above, the response would be as follows:

```
{
  itemsByEntityType: {
    chicken: [{breed: 'sussex', name: 'ginger', dateOfBirth: '2021-07-01', coop: 'bristol'}],
    duck: [{breed: 'mallard', name: 'waddles', yearOfBirth: '2021', coop: 'bristol'}]
  }
}
```

DynamoDB Entity Store is doing the following here:

* Validates that all the entities passed in `forMultiple(entities)` are using the same table - DynamoDB Entity Store doesn't support multiple-entity queries or scans across multiple tables in one request.
* Generates a key using the "key entity" (the first parameter of `queryAllWithGsiByPk`) and the key source (the second parameter). 
* Performs the query against DynamoDB as usual
* Separates the results out for each entity by reading the entity type attribute (`_et` in the default case) on each returned item and comparing that with the `type` field on all of the entities passed in `forMultiple()`
* Performs standard parsing on each entity's result list in the usual way

Let's look at the details of this.

### Specifying entities

You specify **the entities you want to parse results for** in the argument of `forMultiple(entities)`.
The queries you end up running may get items from DynamoDB for more entities - and that's OK - but Entity Store will only try to parse the results that you specify an entity for.

The way that DynamoDB Entity Store knows how to map result items to Entities is by way of the entity type attribute on returned results.
This has the following implications:
* The table you are querying **must** have an `entityType` configured during store setup (on `metaAttributeNames`)
* Every item that you want to parse **must** have the correct entity type attribute set (this will automatically be the case if you've created those items using Entity Store previously) 

Notice that I said just above "the table", not "the tables" - every entity that you pass to `forMultiple(entities)` must map to the same underlying table.
That's going to automatically be the case for single-table configuration, but if you have a _multi-table_ configuration you can't perform a _multi-entity_ query across more than one table.

### Picking the operation method

`forMultiple(entities)` returns an object of type [`MultipleEntityOperations`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/MultipleEntityOperations.html). 
This contains eight query methods, all of which have the same names as those on [`SingleEntityAdvancedOperations`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/SingleEntityAdvancedOperations.html).

This name matching is intentional - the multi-entity query operations mostly use the same logic as the single-entity versions.
As such if you haven't done so already you'll want to go read up on queries in chapters [4](SingleEntityTableQueriesAndTableScans.md) and [5](GSIs.md) to decide which operation you want.

### Key Source and Key Entity

With the single-entity queries you must specify a `keySource` item, which is used to generate the PK or GSI PK value included in the actual DynamoDB query.
Entity Store knows what generator function to use since the query is performed in the context of a specific entity.

For multi-entity queries though there isn't one specific entity in context, and so you need to tell Entity Store which entity to use for generating the PK.
That's why the first parameter on all the multi-entity query operations is an entity - this is the specific entity to use for key generation.

You can pick any of the entities you passed to `forMultiple(entities)` since (by definition) they're all going to generate the same key, otherwise you wouldn't be performing this query!
The one thing to be careful of is that the different entities you're using might take slightly different key source structures if the logic they're using to generate the key differs.
So just make sure that your `keyEntity` value (first parameter) and `pkSource` value (second parameter) are correct for each other.   

### Query-all vs query-by-page, SK query ranges, options

Everything else about how you call the multiple-entity queries is precisely the same as the single-entity queries,
and is explained in chapters [4](SingleEntityTableQueriesAndTableScans.md), [5](GSIs.md), and [6](AdvancedSingleEntityOperations.md).

And remember to be careful with query-all operations!

### Response format

The response format of all the multi-entity queries is the type [`MultipleEntityCollectionResponse`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/MultipleEntityCollectionResponse.html).

The primary property on this object, and the only one guaranteed to exist, is `itemsByEntityType`.
This is a dictionary of entity-type (the value of `.type` on each entity concerned) to a list of parsed items.
Note that the number of types included here may be smaller than the number of entities you passed to `forMultiple(entities)` since the response only includes entities for which items were returned from DynamoDB.

The parsing algorithm is precisely the same as I've described in earlier chapters.

If no parsable items were returned from DynamoDB then `itemsByEntityType` will be an empty object.

The other fields on the response are all the same as those described in [chapter 6](AdvancedSingleEntityOperations.md).
Note that `unparsedItems` will **only** include items that don't map to any of the entities passed in `forMultiple(entities)`.

## Scanning multiple entities

As I've described previously, scanning is typically a bad idea with DynamoDB, but DynamoDB Entity Store let's you do it, as long as you explicitly configure allowing scans during store setup.

Just like you can query for multiple entities in one operation for one table, you can also scan.

Say our animals table contains both sheep and chickens using the Entities you've already seen.
These entities don't share any key formats, and so if we want to get sheep and chickens in one query operation we can't.
We can, however, scan the table for all sheep and chickens, as follows:

```typescript
// Create the entity store as usual, allowing scans
const entityStore = createStore({
  ...createStandardSingleTableConfig('AnimalsTable'),
  allowScans: true
})

// Scan for all sheep and chickens
const animals = await entityStore
  .forMultiple([SHEEP_ENTITY, CHICKEN_ENTITY])
  .scanAll()
```

This would return something of the form:

```
{
  itemsByEntityType: {
    sheep: [{ breed: 'merino', name: 'bob', ageInYears: 4 }, { breed: 'merino', name: 'shaun', ageInYears: 3 }]
    chicken: [{breed: 'sussex', name: 'ginger', dateOfBirth: '2021-07-01', coop: 'bristol'}]
  },
  unparsedItems: [
    {
      PK: 'DUCK#BREED#mallard',
      SK: 'YEAROFBIRTH#2021#NAME#waddles', 
      GSIPK: 'COOP#bristol',
      GSISK: 'DUCK#BREED#mallard#YEAROFBIRTH#2021',
      breed: 'mallard',
      name: 'waddles',
      yearOfBirth: '2021',
      coop: 'bristol',
      _et: 'duck',
      _lastUpdated: '2023-08-21T15:42:53.116Z'
    } 
  ]
}
```

The rules here about specifying entities in `forMultiple(entities)` that I explained above for queries are all the same here.
The result format is also the same as for queries - note that any items in the table of an entity type not included in `forMultiple(entities)` are available in the `unparsedItems` field.

The two scan operations (all, and by-page) have the same options as their single-entity equivalents, and so I again refer you to [chapter 6](AdvancedSingleEntityOperations.md) to learn more. 