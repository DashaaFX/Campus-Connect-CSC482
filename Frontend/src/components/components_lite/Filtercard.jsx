import React, { useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { useDispatch } from "react-redux";
import { setSearchedQuery } from "@/redux/jobSlice";

const filterData = [
  {
    filterType: "Textbooks & Academic Materials",
    array: [
      "Used textbooks",
      "Reference books",
      "Lab manuals",
      "Solution guides"
      
    ]
  },
  {
    filterType: "Study & Exam Resources",
    array: [
      "Lecture notes (PDF/printed)",
      "Past exam papers",
      "Study guides",
      "Research papers"
    ]
  },
  {
    filterType: "Electronics & Gadgets",
    array: [
      "Laptops & accessories",
      "Calculators",
      "Tablets & e-readers",
      "Headphones & speakers",
      "Chargers & cables"
    ]
  },
  {
    filterType: "Dorm & Furniture",
    array: [
      "Mini-fridges",
      "Bedding",
      "Shevles & Bins",
      "Lamps & lighting"
    ]
  },
  {
    filterType: "Clothing & Accessories",
    array: [
      "Formal wear",
      "Winter gear",
      "University merch",
      "Bags & backpacks"
    ]
  },
  {
    filterType: "School & Office Supplies",
    array: [
      "Notebooks & binders",
      "Pens, highlighters, markers",
      "Staplers, hole punchers",
      "Printer ink & paper"
    ]
  },
  {
    filterType: "Sports & Fitness Equipment",
    array: [
      "Yoga mats",
      "Bikes & bike locks",
      "Sports gear"
    ]
  },
  {
    filterType: "Miscellaneous",
    array: [
      "Kitchen appliances",
      "Board games",
      "Suitcases",
      "Art supplies"
    ]
  }
];

const Filter = () => {
  const [selectedValue, setSelectedValue] = useState("");
  const handleChange = (value) => {
    setSelectedValue(value);
  };
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setSearchedQuery(selectedValue));
  }, [selectedValue]);

  return (
    <div className="w-full bg-white rounded-md">
      <h1 className="font-bold text-lg">Filter Products</h1>
      <hr className="mt-3" />
      <RadioGroup value={selectedValue} onValueChange={handleChange}>
        {filterData.map((data, index) => (
          <div key={index}>
            <h2 className="font-bold text-lg">{data.filterType}</h2>

            {data.array.map((item, indx) => {
              const itemId = `Id${index}-${indx}`;
              return (
                <div key={itemId} className="flex items-center space-x-2 my-2">
                  <RadioGroupItem value={item} id={itemId}></RadioGroupItem>
                  <label htmlFor={itemId}>{item}</label>
                </div>
              );
            })}
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};

export default Filter;
