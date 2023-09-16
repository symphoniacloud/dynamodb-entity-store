import { CloudFormationClient, DescribeStacksCommand, Output } from '@aws-sdk/client-cloudformation'
import { throwError } from '../../../src/lib/util/errors'
import { DeleteCommand, DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'

export let testTableName: string
export let customTableName: string
export let farmTableName: string

export async function findTestTableName() {
  if (!testTableName) {
    testTableName = await findTableName('TableName')
    console.log(`Found test table ${testTableName}`)
  }
  return testTableName
}

export async function findCustomTableName() {
  if (!customTableName) {
    customTableName = await findTableName('CustomTableName')
    console.log(`Found custom table ${customTableName}`)
  }
  return customTableName
}

export async function findFarmTableName() {
  if (!farmTableName) {
    farmTableName = await findTableName('FarmTableName')
    console.log(`Found farm table ${farmTableName}`)
  }
  return farmTableName
}

let testStackOutputs: Output[]

async function findTableName(outputKey: string) {
  if (!testStackOutputs) {
    const cloudformationStacks = await new CloudFormationClient({}).send(
      new DescribeStacksCommand({ StackName: 'entity-store-test-stack' })
    )

    if (!cloudformationStacks.Stacks || cloudformationStacks.Stacks.length < 1) {
      throw new Error('Unable to find stack')
    }

    testStackOutputs = cloudformationStacks.Stacks?.[0].Outputs ?? []
  }

  const tableName = testStackOutputs.find((output) => output.OutputKey === outputKey)?.OutputValue

  return tableName ?? throwError('Unable to find table name')()
}

export function createDocumentClient() {
  return DynamoDBDocumentClient.from(new DynamoDBClient({}))
}

export async function dynamoDbEmptyTable(
  tableName: string,
  dynamoDbDocumentClient?: DynamoDBDocumentClient,
  pk = 'PK',
  sk = 'SK'
) {
  const docClient = dynamoDbDocumentClient ?? createDocumentClient()
  const items = await dynamoDbScanTable(tableName, docClient)
  for (const item of items) {
    await docClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: {
          [pk]: item[pk],
          [sk]: item[sk]
        }
      })
    )
  }
}

export async function dynamoDbScanTable(tableName: string, dynamoDbDocumentClient?: DynamoDBDocumentClient) {
  const docClient = dynamoDbDocumentClient ?? createDocumentClient()
  return (await docClient.send(new ScanCommand({ TableName: tableName }))).Items ?? []
}
