export default ({ objName }) =>`
    on${objName}Deleted: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['${objName}_DELETED']),
        (payload, variables) => {
          return payload.on${objName}Deleted._id === variables._id;
        },
      ),
    }`;
