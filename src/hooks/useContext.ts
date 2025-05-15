import { useContext, Context } from "react";

export default <TContext>(context: Context<TContext | undefined>): TContext => {
  const ctx = useContext(context);

  if (context === undefined) {
    throw Error("context is undefined");
  }

  return ctx as TContext;
};
