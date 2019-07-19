export default ({ objName }) =>`
    on${objName}Created: {
      subscribe: () => pubsub.asyncIterator(['${objName}_CEATED'])
    }`;
