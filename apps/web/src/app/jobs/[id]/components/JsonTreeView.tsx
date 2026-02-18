"use client";

import { useState, useCallback, useMemo } from "react";
import { JsonView, defaultStyles } from "react-json-view-lite";
import toast from "react-hot-toast";
import styles from "./JsonTreeView.module.css";

interface JsonTreeViewProps {
  data: object | Array<any>;
  jsonText: string;
}

export function JsonTreeView({ data, jsonText }: JsonTreeViewProps) {
  const [expandLevel, setExpandLevel] = useState(2);

  const shouldExpandNode = useCallback(
    (level: number) => level < expandLevel,
    [expandLevel]
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      toast.success("JSON copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, [jsonText]);

  const customStyles: typeof defaultStyles = useMemo(
    () => ({
      ...defaultStyles,
      container: styles.treeContainer,
      basicChildStyle: styles.childNode,
      childFieldsContainer: styles.childFieldsContainer,
      label: styles.nodeLabel,
      clickableLabel: styles.clickableLabel,
      nullValue: styles.valueNull,
      undefinedValue: styles.valueUndefined,
      stringValue: styles.valueString,
      booleanValue: styles.valueBoolean,
      numberValue: styles.valueNumber,
      otherValue: styles.valueOther,
      punctuation: styles.punctuation,
      expandIcon: styles.expandIcon,
      collapseIcon: styles.collapseIcon,
      collapsedContent: styles.collapsedContent,
    }),
    []
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <button
            className={styles.toolbarBtn}
            onClick={() => setExpandLevel(100)}
            disabled={expandLevel >= 100}
            title="Expand all nodes"
          >
            Expand All
          </button>
          <button
            className={styles.toolbarBtn}
            onClick={() => setExpandLevel(1)}
            disabled={expandLevel <= 1}
            title="Collapse all nodes"
          >
            Collapse All
          </button>
        </div>
        <button
          className={`${styles.toolbarBtn} ${styles.copyBtn}`}
          onClick={handleCopy}
          title="Copy JSON to clipboard"
        >
          Copy JSON
        </button>
      </div>
      <div className={styles.treeWrapper}>
        <JsonView
          data={data}
          shouldExpandNode={shouldExpandNode}
          clickToExpandNode
          style={customStyles}
        />
      </div>
    </div>
  );
}
