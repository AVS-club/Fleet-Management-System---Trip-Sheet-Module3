@@ .. @@
 import React from 'react';
-import { clsx } from 'clsx';
-import { twMerge } from 'tailwind-merge';
+import { cn } from '../../utils/cn';
 
 interface StatCardProps {
   title: string;
@@ .. @@
 
 const StatCard: React.FC<StatCardProps> = ({
   title,
   value,
   subtitle,
   icon,
   trend,
   className,
   warning = false,
+  onClick,
 }) => {
   return (
-    <div className={twMerge(clsx(
+    <div 
+      className={cn(
       "card p-3 sm:p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg transition-all", 
       warning && "border-l-4 border-warning-500 dark:border-warning-600", 
-      className
-    ))}>
+      className,
+      onClick && "cursor-pointer hover:shadow-md"
+      )}
+      onClick={onClick}
+    >
       <div className="flex justify-between items-start gap-2">
         <div>
           <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</h3>