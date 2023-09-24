import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation'
import { throwError } from '../../../src/lib'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'

export async function initAWSResources() {
  const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}))

  const cloudformationStacks = await new CloudFormationClient({}).send(
    new DescribeStacksCommand({ StackName: 'entity-store-test-stack' })
  )

  if (!cloudformationStacks.Stacks || cloudformationStacks.Stacks.length < 1) {
    throw new Error('Unable to find stack')
  }

  const stackOutputs = cloudformationStacks.Stacks?.[0].Outputs ?? []

  function findTableName(outputKey: string) {
    const tableName = stackOutputs.find((output) => output.OutputKey === outputKey)?.OutputValue
    return tableName ?? throwError('Unable to find table name')()
  }

  const newTestTableName = findTableName('TableName')
  const newCustomTableName = findTableName('CustomTableName')
  const newFarmTableName = findTableName('FarmTableName')

  console.log(
    `testTableName = ${newTestTableName}, customTableName = ${newCustomTableName}, farmTableName = ${newFarmTableName}`
  )

  return {
    documentClient,
    testTableName: newTestTableName,
    customTableName: newCustomTableName,
    farmTableName: newFarmTableName
  }
}
