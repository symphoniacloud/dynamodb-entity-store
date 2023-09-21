# Chapter 5 - Using Global Secondary Indexes

In the [last chapter](SingleEntityTableQueriesAndTableScans.md) you learned how to perform queries and scans over tables.
This chapter shows you how to do the same for Global Secondary Indexes (GSIs).

Like most things DynamoDB with, GSIs are kind of like indexes in relational databases, but also very different.
If you haven't used GSIs before I strongly recommend you do some background reading first, either from [the official AWS docs](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html), or perhaps from [this brief overview](https://www.dynamodbguide.com/global-secondary-indexes/) by Alex DeBrie.

> Important! Because of the way that result parsing is performed you should typically set your GSI's _ProjectionType_ to `ALL` (see [the AWS docs](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Projection.html)) when using GSIs with DynamoDB Entity Store.
If you need to use a different projection type, e.g. to reduce the number of attributes stored on a GSI, then you may want to consider using a different _Entity_ for querying from a GSI vs the one you use to access the GSI's table.

You need to perform three actions when using GSIs with DynamoDB Entity Store:

* Configure your store
* Code your Entity objects
* Perform queries and/or scans

I go through each in turn for the rest of this chapter.

## GSI Configuration

Back in [the first chapter](Setup.md) I described how to setup your store. E.g. the most simple configuration is as follows:

```typescript
const entityStore = createStore(createStandardSingleTableConfig('AnimalsTable'))
```

If you use `createStandardSingleTableConfig()` then it already configures one GSI on your table. You can see this from the following snippet of the generated configuration:

```
{
  tableName: 'AnimalsTable',
  gsiNames: {
    gsi: 'GSI'
  },
  metaAttributeNames: {
    gsisById: {
      gsi: {
        pk: 'GSIPK',
        sk: 'GSISK'
      }
    }
    ... etc.
  }
}
```

What this configuration is saying is:

* On table `AnimalsTable`...
* there is a GSI named `GSI`...
* which is referenced by the "logical" name `gsi` ...
* and which has a partition key using attribute `GSIPK`, and a sort key using attribute `GSISK`

In other words to configure one or many GSIs on a table you need to do the following on a table configuration:

* Define a property named `gsiNames`. This is a map from "logical" GSI name (which is used everywhere else) to "physical" GSI name (what it's actually called in DynamoDB)
* On `metaAttributeNames` define a sub-property named `gsisById`. This is a map from "logical" GSI name (as defined in `gsiNames`) to key configuration. Each configuration **must** include a partition key name (`pk`), and if you have a sort key on your GSI then also a sort key name (`sk`)

Say our animals table actually has two GSIs - one named `GSI1` and one named `GSI2`.
We could configure this as follows:

```typescript
// Use standard config, but override `gsiNames`
const animalsTableConfig: TableConfig = {
  ...createStandardSingleTableConfig('AnimalsTable'),
  gsiNames: {
    gsi1: 'GSI1',
    gsi2: 'GSI2'
  }
}
// Replace gsi key details 
animalsTableConfig.metaAttributeNames.gsisById = {
  gsi1: {
    pk: 'GSI1PK',
    sk: 'GSI1SK'
  },
  gsi2: {
    pk: 'GSI2PK',
    sk: 'GSI2SK'
  }
}
// Create store
const entityStore = createStore(animalsTableConfig)
```

A couple of final points:

* You can configure as many GSIs as you like in DynamoDB Entity Store - the only limitation is how many GSIs DynamoDB supports
* If you're using a multi-table configuration, and are using GSIs on any/all of your tables, then update each table's configuration in the same way as I've described here.

## Coding your Entities to use GSIs

I described how to code your _Entities_ to use GSIs back in [chapter 2](Entities.md) - look for the section named `.gsis` .

Here's an example:

```typescript
export const CHICKEN_ENTITY: Entity<
  Chicken,
  Pick<Chicken, 'breed'>,
  Pick<Chicken, 'name' | 'dateOfBirth'>
> = {
  type: 'chicken',
  parse: typePredicateParser(isChicken, 'chicken'),
  pk({ breed }: Pick<Chicken, 'breed'>): string {
    return `CHICKEN#BREED#${breed}`
  },
  sk({ name, dateOfBirth }: Pick<Chicken, 'name' | 'dateOfBirth'>): string {
    return `DATEOFBIRTH#${dateOfBirth}#NAME#${name}`
  },
  gsis: {
    gsi: {
      pk({ coop }: Pick<Chicken, 'coop'>): string {
        return `COOP#${coop}`
      },
      sk({ breed, dateOfBirth }: Pick<Chicken, 'breed' | 'dateOfBirth'>): string {
        return `CHICKEN#BREED#${breed}#DATEOFBIRTH#${dateOfBirth}`
      }
    }
  }
}
```

This _Entity_ is valid when it's used against a table that has the same "standard" GSI configuration shown earlier - i.e. a table that has a GSI with logical name `gsi` .

If we _put_ an object using this Entity...

```typescript
const entityStore = createStore(createStandardSingleTableConfig('AnimalsTable'))
await entityStore.for(CHICKEN_ENTITY).put({ breed: 'sussex', name: 'ginger', dateOfBirth: '2021-07-01', coop: 'bristol' })
```

... then the result is as follows:

| `PK`                   | `SK`                                 | `GSIPK`        | `GSISK`                                       | `breed`  | `name`   | `dateOfBirth` | `coop`    | `_et`     | `_lastUpdated`             |
|------------------------|--------------------------------------|----------------|-----------------------------------------------|----------|----------|---------------|-----------|-----------|----------------------------|
| `CHICKEN#BREED#sussex` | `DATEOFBIRTH#2021-07-01#NAME#ginger` | `COOP#bristol` | `CHICKEN#BREED#sussex#DATEOFBIRTH#2021-07-01` | `sussex` | `ginger` | `2021-07-01`  | `bristol` | `chicken` | `2023-08-21T15:41:53.566Z` |

The difference between this, and what I showed in the [Getting Started With Operations](GettingStartedWithOperations.md) chapter, is that DynamoDB Entity Store has automatically **generated** the `GSIPK` and `GSISK` attributes.
DynamoDB Entity Store has done this because it knows, from configuration, that the table being written to has a logical GSI named `gsi`; it's then found the GSI _generator functions_ under `gsi` in the _Entity_; and it's then called `pk()` and `sk()` of those functions.
With these values it can then write the attributes using the names configured in the table (`GSIPK`, `GSISK`).

Because all the DynamoDB configuration - GSI name and key attribute names - are defined in table configuration then our Entity code doesn't need to be aware of those names at all.

Note that it's perfectly possibly to **not** define generator functions on an _Entity_ for a GSI, even if the _table_ defines a GSI. In fact that was the case for all of our previous `SHEEP_ENTITY` examples.
In this case DynamoDB Entity Store will still find the GSI configuration in the table, but because there are no corresponding generator functions in the entity it doesn't create the GSI attributes during a _put_ operation.

It's also possible to have a GSI that has a partition key, but no sort key.
In such a case don't configure the `sk` name in the table config under `metaAttributeNames`, and don't code an `sk()` generator function.

If you want to generate the key values for multiple GSIs in an Entity, then  define multiple entries in the `gsis` map.
E.g. say that we wanted `CHICKEN_ENTITY` to actually use the two-GSI table I configured earlier, with gsis logically named `gsi1` and `gsi2`.
In that case I would code the Entity as follows:

```typescript
export const TWO_GSI_CHICKEN_ENTITY: Entity<
  Chicken,
  Pick<Chicken, 'breed'>,
  Pick<Chicken, 'name' | 'dateOfBirth'>
> = {
  // Other fields stay the same as previous example
  // ...
  gsis: {
    // This gsi now has the logical name `gsi1`
    gsi1: {
      pk({ coop }: Pick<Chicken, 'coop'>): string {
        return `COOP#${coop}`
      },
      sk({ breed, dateOfBirth }: Pick<Chicken, 'breed' | 'dateOfBirth'>): string {
        return `CHICKEN#BREED#${breed}#DATEOFBIRTH#${dateOfBirth}`
      }
    },
    // Second GSI
    gsi2: {
      // Note that we don't have to use **any** value when generating a PK or SK - it can be constant
      pk(): string {
        return `CHICKEN`
      },
      sk({ dateOfBirth }: Pick<Chicken, 'dateOfBirth'>): string {
        return `DATEOFBIRTH#${dateOfBirth}`
      }
    },
  }
}
```

If your _table_ has multiple GSIs, but an _Entity_ using that table doesn't use all the GSIs, then just code the generator functions on the Entity for the GSIs it **does** use, and everything will work out fine. 

Once your entities are coded, and you are successfully writing objects with the correct GSI attributes values during `put` operations, then you can start performing queries and scans.

## Performing queries and/or scans with GSIs

Query and scan operations with GSIs work very similarly in DynamoDB Entity Store to query and scan operations with tables.
Therefore as a pre-requisite you should read [the Table Queries and Table Scans chapter](SingleEntityTableQueriesAndTableScans.md) if you haven't done so already.

In the Table Queries and Scans chapter I described the four _standard_ query operations and two _standard_ scan operations that exist in [`SingleEntityOperations`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/SingleEntityOperations.html).
All six of these operations have GSI equivalents **on the same [`SingleEntityOperations`](https://symphoniacloud.github.io/dynamodb-entity-store/interfaces/SingleEntityOperations.html) type**, as follows:

| Table operation           | Equivalent GSI operation         |
|---------------------------|----------------------------------|
| `queryAllByPk()`          | `queryAllWithGsiByPk()`          |
| `queryOnePageByPk()`      | `queryOnePageWithGsiByPk()`      |
| `queryAllByPkAndSk()`     | `queryAllWithGsiByPkAndSk()`     |
| `queryOnePageByPkAndSk()` | `queryOnePageWithGsiByPkAndSk()` |
| `scanAll()`               | `scanAllWithGsi()`               |
| `scanOnePage()`           | `scanOnePageWithGsi()`           |

The differences between the table and GSI versions are fairly minimal, but I'll describe them next

### Querying with GSIs

Let's start with the most simple GSI query operation: `queryAllWithGsiByPk()`.

#### Query all with GSI by PK

For our Chickens entity (the first one above, with just one GSI) say that we want to find all the chickens in the coop named `bristol`.
To do so we can perform the following query:

```typescript
const entityStore = createStore(createStandardSingleTableConfig('AnimalsTable'))
const chickensInBristol: Chicken[] = await entityStore.for(CHICKEN_ENTITY).queryAllWithGsiByPk({ coop: 'bristol' })
```

This looks the same as using `queryAllByPk`, except that the `pkSource` value is now a _GSI PK_ source value.
And instead of calling `CHICKEN_ENTITY.pk()` to generate the key value, DynamoDB Entity Store is calling `CHICKEN_ENTITY.gsis.gsi.pk()`

Just like `queryAllByPk`, `queryAllWithGsiByPk` will attempt to read **all** pages that satisfy the criteria.
So all those scary warnings from [the Table Queries and Table Scans chapter](SingleEntityTableQueriesAndTableScans.md) also apply here!

The GSI Query and Scan operations perform **precisely the same entity filtering and parsing behavior** as their table-targeted twins.
So in our example the result is of type `Chicken[]` because:
 
* `queryAllWithGsiByPk` has filtered all the DynamoDB results to just those where `_et` === `chicken` ...
* ... and it has called `CHICKEN_ENTITY.parse()` on all items

The `options?` parameter of each `query..WithGsi..` operation is the same as the table equivalent **except** for the following two differences :

1 - If you have multiple GSIs on your table then you **must** specify which GSI you are using on each GSI query using the "logical" GSI ID.
For example, if we wanted to use `TWO_GSI_CHICKEN_ENTITY` from above our query needs to change as follows:

```typescript
const chickensInBristol: Chicken[] = await entityStore
  .for(TWO_GSI_CHICKEN_ENTITY)
  .queryAllWithGsiByPk({ coop: 'bristol' }, { gsiId: 'gsi1'})
```

2 - `consistentRead` is not permitted by DynamoDB on GSI queries.

#### Query all with GSI by PK and SK

If you are querying by both PK **and SK range** then everything described above also holds true for `queryAllWithGsiByPkAndSk()` vs `queryAllByPkAndSk()`, specifically:

* `pkSource` has to be valid for the GSI PK generator function
* Result behavior is the same as the table operation
* The two differences for `options?` are the same as for `queryAllWithGsiByPk`

When querying a GSI with an SK range the syntax is the same as querying a table.
The only thing you need to remember is that you need to give a valid range for your GSI's SK, **not** your table's SK.

#### Query one page with GSI

Both one-page operations have the same differences described above, but versus their table-based equivalents.

### Scanning with GSIs

It's fairly unusual to scan with GSIs - especially with DynamoDB Entity Store because of the guidance given at the beginning of this chapter around GSI _ProjectionType_.
But if you want to you can.

There is only one difference between GSI Scans and Table Scans in Entity Store, which is the rule described above about multiple GSIs.
In other words if you want to scan all on a table with multiple GSIs you would call the following:

```typescript
const allChickens = await chickenOperations.scanAll({ gsiId: 'gsi1' })
```


